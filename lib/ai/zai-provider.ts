import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4FinishReason,
  LanguageModelV4FunctionTool,
  LanguageModelV4GenerateResult,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4StreamResult,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";
import ZAI from "z-ai-web-dev-sdk";

/**
 * Custom AI SDK LanguageModelV4 provider backed by z-ai-web-dev-sdk.
 *
 * Replaces the Vercel AI Gateway with the local Z.AI OpenAI-compatible
 * endpoint. Supports streaming, tool calling and vision (image parts).
 */

type OpenAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null | Record<string, unknown>[];
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

type OpenAIChunk = {
  id?: string;
  model?: string;
  choices: Array<{
    index?: number;
    delta: {
      role?: string;
      content?: string | null;
      reasoning_content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
};

function mapFinishReason(
  raw: string | undefined | null
): LanguageModelV4FinishReason {
  switch (raw) {
    case "stop":
      return { raw: "stop", unified: "stop" };
    case "length":
    case "max_tokens":
      return { raw: raw ?? undefined, unified: "length" };
    case "tool_calls":
    case "function_call":
      return { raw: raw ?? undefined, unified: "tool-calls" };
    case "content_filter":
      return { raw: raw ?? undefined, unified: "content-filter" };
    default:
      return { raw: raw ?? undefined, unified: "other" };
  }
}

function mapUsage(
  usage: OpenAIChunk["usage"] | undefined
): LanguageModelV4Usage {
  return {
    inputTokens: {
      cacheRead: 0,
      cacheWrite: 0,
      noCache: usage?.prompt_tokens,
      total: usage?.prompt_tokens,
    },
    outputTokens: {
      reasoning: 0,
      text: usage?.completion_tokens,
      total: usage?.completion_tokens,
    },
    ...(usage
      ? {
          raw: {
            completion_tokens: usage.completion_tokens ?? 0,
            prompt_tokens: usage.prompt_tokens ?? 0,
            total_tokens: usage.total_tokens ?? 0,
          },
        }
      : {}),
  };
}

async function filePartToDataUrl(
  part: Extract<
    LanguageModelV4Prompt[number]["content"][number],
    { type?: "file" }
  > & {
    type: "file";
  }
): Promise<string | null> {
  const mediaType = part.mediaType ?? "image/png";

  if (!mediaType.startsWith("image/")) {
    return null;
  }

  const { data } = part;

  if (data.type === "url") {
    const url = String(data.url);

    if (url.startsWith("data:")) {
      return url;
    }

    // Local/dev URLs are not reachable by the upstream API: inline them.
    if (/^https?:/i.test(url)) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          return `data:${mediaType};base64,${base64}`;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  if (data.type === "data") {
    const bytes =
      data.data instanceof Uint8Array
        ? data.data
        : Buffer.from(String(data.data), "base64");
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mediaType};base64,${base64}`;
  }

  return null;
}

async function convertPromptToMessages(
  prompt: LanguageModelV4Prompt
): Promise<OpenAIMessage[]> {
  const messages: OpenAIMessage[] = [];

  for (const message of prompt) {
    if (message.role === "system") {
      messages.push({ content: message.content, role: "system" });
      continue;
    }

    if (message.role === "user") {
      const contentParts: Record<string, unknown>[] = [];
      const textParts: string[] = [];

      for (const part of message.content) {
        if (part.type === "text") {
          textParts.push(part.text);
        } else if (part.type === "file") {
          // biome-ignore lint/performance/noAwaitInLoops: sequential conversion preserves attachment ordering
          const dataUrl = await filePartToDataUrl(part);
          if (dataUrl) {
            contentParts.push({
              image_url: { url: dataUrl },
              type: "image_url",
            });
          } else {
            textParts.push(
              `[attachment: ${part.filename ?? "file"} (${
                part.mediaType ?? "unknown"
              })]`
            );
          }
        }
      }

      if (contentParts.length > 0) {
        for (const text of textParts) {
          contentParts.push({ text, type: "text" });
        }
        messages.push({ content: contentParts, role: "user" });
      } else {
        messages.push({ content: textParts.join("\n"), role: "user" });
      }

      continue;
    }

    if (message.role === "assistant") {
      const text: string[] = [];
      const toolCalls: NonNullable<OpenAIMessage["tool_calls"]> = [];

      for (const part of message.content) {
        if (part.type === "text") {
          text.push(part.text);
        } else if (part.type === "tool-call") {
          toolCalls.push({
            function: {
              arguments:
                typeof part.input === "string"
                  ? part.input
                  : JSON.stringify(part.input ?? {}),
              name: part.toolName,
            },
            id: part.toolCallId,
            type: "function",
          });
        }
      }

      messages.push({
        content: text.join("") || null,
        role: "assistant",
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });

      continue;
    }

    if (message.role === "tool") {
      for (const part of message.content) {
        if (part.type !== "tool-result") {
          continue;
        }

        let resultText = "";
        const { output } = part;

        if (output && typeof output === "object" && "type" in output) {
          if (output.type === "text") {
            resultText = String((output as { value?: unknown }).value ?? "");
          } else if (output.type === "json") {
            resultText = JSON.stringify(
              (output as { value?: unknown }).value ?? null
            );
          } else {
            resultText = JSON.stringify(output);
          }
        } else {
          resultText = JSON.stringify(output ?? null);
        }

        messages.push({
          content: resultText,
          role: "tool",
          tool_call_id: part.toolCallId,
        });
      }
    }
  }

  return messages;
}

function convertTools(
  options: LanguageModelV4CallOptions
): Record<string, unknown>[] | undefined {
  const tools = (options.tools ?? []).filter(
    (tool): tool is LanguageModelV4FunctionTool => tool.type === "function"
  );

  if (tools.length === 0) {
    return;
  }

  return tools.map((tool) => ({
    function: {
      description: tool.description ?? "",
      name: tool.name,
      parameters: tool.inputSchema ?? { properties: {}, type: "object" },
    },
    type: "function",
  }));
}

function mapToolChoice(
  options: LanguageModelV4CallOptions
): string | undefined {
  if (!options.tools || options.tools.length === 0) {
    return;
  }

  switch (options.toolChoice?.type) {
    case "none":
      return "none";
    case "required":
      return "required";
    case "tool":
      return "auto";
    default:
      return "auto";
  }
}

function createBodyBase(options: LanguageModelV4CallOptions, modelId: string) {
  const messagesPromise = convertPromptToMessages(options.prompt);
  const hasImages = options.prompt.some(
    (message) =>
      message.role === "user" &&
      message.content.some(
        (part) =>
          part.type === "file" && (part.mediaType ?? "").startsWith("image/")
      )
  );

  return {
    hasImages,
    max_tokens: options.maxOutputTokens,
    messagesPromise,
    model: modelId,
    seed: options.seed,
    stop: options.stopSequences,
    temperature: options.temperature,
    thinking: { type: "disabled" as const },
    tool_choice: mapToolChoice(options),
    tools: convertTools(options),
    top_p: options.topP,
  };
}

function buildToolCallId(index: number, existingId?: string): string {
  return existingId ?? `zai_tool_${index}`;
}

function createSSEStreamParser() {
  let buffer = "";

  return function extractChunks(text: string): {
    chunks: OpenAIChunk[];
    done: boolean;
  } {
    buffer += text;
    const chunks: OpenAIChunk[] = [];
    let done = false;

    for (;;) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line?.startsWith("data:")) {
        continue;
      }

      const payload = line.slice(5).trim();

      if (payload === "[DONE]") {
        done = true;
        continue;
      }

      try {
        chunks.push(JSON.parse(payload) as OpenAIChunk);
      } catch {
        // Ignore malformed SSE lines.
      }
    }

    return { chunks, done };
  };
}

function createZAIModel(modelId: string): LanguageModelV4 {
  return {
    async doGenerate(
      options: LanguageModelV4CallOptions
    ): Promise<LanguageModelV4GenerateResult> {
      const base = createBodyBase(options, modelId);
      const messages = await base.messagesPromise;
      const zai = await ZAI.create();

      const body = {
        max_tokens: base.max_tokens,
        messages,
        model: base.model,
        seed: base.seed,
        stop: base.stop,
        temperature: base.temperature,
        thinking: base.thinking,
        tool_choice: base.tool_choice,
        tools: base.tools,
        top_p: base.top_p,
      };

      const completion = base.hasImages
        ? await zai.chat.completions.createVision(body as never)
        : await zai.chat.completions.create(body as never);

      const choice = completion?.choices?.[0];
      const message = choice?.message;

      const content: LanguageModelV4GenerateResult["content"] = [];

      if (message?.content) {
        content.push({ text: message.content, type: "text" });
      }

      if (Array.isArray(message?.tool_calls)) {
        for (const toolCall of message.tool_calls) {
          content.push({
            input: toolCall.function?.arguments ?? "{}",
            toolCallId: toolCall.id ?? `zai_tool_${content.length}`,
            toolName: toolCall.function?.name ?? "",
            type: "tool-call",
          });
        }
      }

      return {
        content,
        finishReason: mapFinishReason(choice?.finish_reason),
        usage: mapUsage(completion?.usage),
        warnings: [],
      };
    },

    async doStream(
      options: LanguageModelV4CallOptions
    ): Promise<LanguageModelV4StreamResult> {
      const base = createBodyBase(options, modelId);
      const messages = await base.messagesPromise;
      const zai = await ZAI.create();

      const body = {
        max_tokens: base.max_tokens,
        messages,
        model: base.model,
        seed: base.seed,
        stop: base.stop,
        stream: true,
        temperature: base.temperature,
        thinking: base.thinking,
        tool_choice: base.tool_choice,
        tools: base.tools,
        top_p: base.top_p,
      };

      const upstream = base.hasImages
        ? await zai.chat.completions.createVision(body as never)
        : await zai.chat.completions.create(body as never);

      const extractChunks = createSSEStreamParser();

      const stream = new ReadableStream<LanguageModelV4StreamPart>({
        async start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });

          const closeController = () => {
            try {
              controller.close();
            } catch {
              // Already closed.
            }
          };

          let textStarted = false;
          const textId = "t1";

          const startText = () => {
            if (!textStarted) {
              textStarted = true;
              controller.enqueue({ id: textId, type: "text-start" });
            }
          };

          const endText = () => {
            if (textStarted) {
              textStarted = false;
              controller.enqueue({ id: textId, type: "text-end" });
            }
          };

          let reasoningStarted = false;

          const startReasoning = () => {
            if (!reasoningStarted) {
              reasoningStarted = true;
              controller.enqueue({ id: "r1", type: "reasoning-start" });
            }
          };

          const endReasoning = () => {
            if (reasoningStarted) {
              reasoningStarted = false;
              controller.enqueue({ id: "r1", type: "reasoning-end" });
            }
          };

          type ToolAccumulator = {
            id: string;
            name: string;
            arguments: string;
            started: boolean;
          };
          const toolAccumulators = new Map<number, ToolAccumulator>();

          let rawFinishReason: string | undefined;
          let rawUsage: OpenAIChunk["usage"] | undefined;
          let firstChunkId: string | undefined;
          let firstModelId: string | undefined;

          const emitFinalToolCalls = () => {
            for (const [, accumulator] of toolAccumulators) {
              if (accumulator.started) {
                controller.enqueue({
                  id: accumulator.id,
                  type: "tool-input-end",
                });
              }
              controller.enqueue({
                input: accumulator.arguments || "{}",
                toolCallId: accumulator.id,
                toolName: accumulator.name,
                type: "tool-call",
              });
            }
          };

          const finishAndClose = () => {
            endText();
            endReasoning();
            emitFinalToolCalls();
            controller.enqueue({
              finishReason: mapFinishReason(rawFinishReason ?? "stop"),
              type: "finish",
              usage: mapUsage(rawUsage),
            });
            closeController();
          };

          if (!(upstream instanceof ReadableStream)) {
            // Non-streaming fallback: emit whole payload as text.
            const choice = (upstream as any)?.choices?.[0];
            const content = choice?.message?.content;
            if (typeof content === "string" && content.length > 0) {
              controller.enqueue({ id: textId, type: "text-start" });
              controller.enqueue({
                delta: content,
                id: textId,
                type: "text-delta",
              });
              controller.enqueue({ id: textId, type: "text-end" });
            }
            rawFinishReason = choice?.finish_reason ?? "stop";
            rawUsage = (upstream as any)?.usage;
            finishAndClose();
            return;
          }

          const reader = upstream.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              if (options.abortSignal?.aborted) {
                // biome-ignore lint/performance/noAwaitInLoops: stream chunks must be read sequentially
                await reader.cancel().catch(() => undefined);
                endText();
                endReasoning();
                controller.enqueue({
                  finishReason: { raw: "aborted", unified: "other" },
                  type: "finish",
                  usage: mapUsage(rawUsage),
                });
                closeController();
                return;
              }

              const { done, value } = await reader.read();
              if (done) {
                break;
              }

              const text =
                typeof value === "string" ? value : decoder.decode(value);
              const { chunks } = extractChunks(text);

              for (const chunk of chunks) {
                if (!firstChunkId && chunk.id) {
                  firstChunkId = chunk.id;
                }
                if (!firstModelId && chunk.model) {
                  firstModelId = chunk.model;
                }

                if (chunk.usage) {
                  rawUsage = chunk.usage;
                }

                const choice = chunk.choices?.[0];
                if (!choice) {
                  continue;
                }

                if (choice.finish_reason) {
                  rawFinishReason = choice.finish_reason;
                }

                const { delta } = choice;
                if (!delta) {
                  continue;
                }

                if (delta.reasoning_content) {
                  startReasoning();
                  controller.enqueue({
                    delta: delta.reasoning_content,
                    id: "r1",
                    type: "reasoning-delta",
                  });
                }

                if (delta.content) {
                  startText();
                  controller.enqueue({
                    delta: delta.content,
                    id: textId,
                    type: "text-delta",
                  });
                }

                if (Array.isArray(delta.tool_calls)) {
                  for (const toolCall of delta.tool_calls) {
                    const index = toolCall.index ?? 0;
                    let accumulator = toolAccumulators.get(index);

                    if (!accumulator) {
                      accumulator = {
                        arguments: "",
                        id: buildToolCallId(index, toolCall.id),
                        name: toolCall.function?.name ?? "",
                        started: false,
                      };
                      toolAccumulators.set(index, accumulator);
                    }

                    if (toolCall.id && !accumulator.id) {
                      accumulator.id = toolCall.id;
                    }

                    if (toolCall.function?.name) {
                      accumulator.name = toolCall.function.name;
                    }

                    if (!accumulator.started && accumulator.name) {
                      accumulator.started = true;
                      endText();
                      endReasoning();
                      controller.enqueue({
                        id: accumulator.id,
                        toolName: accumulator.name,
                        type: "tool-input-start",
                      });
                    }

                    if (toolCall.function?.arguments) {
                      accumulator.arguments += toolCall.function.arguments;
                      if (accumulator.started) {
                        controller.enqueue({
                          delta: toolCall.function.arguments,
                          id: accumulator.id,
                          type: "tool-input-delta",
                        });
                      }
                    }
                  }
                }
              }
            }
          } catch (error) {
            endText();
            endReasoning();
            controller.enqueue({ error, type: "error" });
            controller.enqueue({
              finishReason: { raw: "error", unified: "error" },
              type: "finish",
              usage: mapUsage(rawUsage),
            });
            closeController();
            return;
          }

          if (firstChunkId || firstModelId) {
            controller.enqueue({
              type: "response-metadata",
              ...(firstChunkId ? { id: firstChunkId } : {}),
              ...(firstModelId ? { modelId: firstModelId } : {}),
              timestamp: new Date(),
            });
          }

          finishAndClose();
        },
      });

      return { stream };
    },
    modelId,
    provider: "zai",
    specificationVersion: "v4",
    supportedUrls: {},
  };
}

export function createZAIProvider() {
  return {
    chatModel(modelId: string) {
      return createZAIModel(modelId);
    },
    languageModel(modelId: string) {
      return createZAIModel(modelId);
    },
  };
}

export const zaiProvider = createZAIProvider();
