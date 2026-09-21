import ZAI from "z-ai-web-dev-sdk";
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

/**
 * Custom AI SDK LanguageModelV4 provider backed by z-ai-web-dev-sdk.
 *
 * Replaces the Vercel AI Gateway with the local Z.AI OpenAI-compatible
 * endpoint. Supports streaming, tool calling and vision (image parts).
 */

type OpenAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null | Array<Record<string, unknown>>;
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

function mapFinishReason(raw: string | undefined | null): LanguageModelV4FinishReason {
  switch (raw) {
    case "stop":
      return { unified: "stop", raw: "stop" };
    case "length":
    case "max_tokens":
      return { unified: "length", raw: raw ?? undefined };
    case "tool_calls":
    case "function_call":
      return { unified: "tool-calls", raw: raw ?? undefined };
    case "content_filter":
      return { unified: "content-filter", raw: raw ?? undefined };
    default:
      return { unified: "other", raw: raw ?? undefined };
  }
}

function mapUsage(
  usage: OpenAIChunk["usage"] | undefined
): LanguageModelV4Usage {
  return {
    inputTokens: {
      total: usage?.prompt_tokens,
      noCache: usage?.prompt_tokens,
      cacheRead: 0,
      cacheWrite: 0,
    },
    outputTokens: {
      total: usage?.completion_tokens,
      text: usage?.completion_tokens,
      reasoning: 0,
    },
    ...(usage
      ? { raw: { prompt_tokens: usage.prompt_tokens ?? 0, completion_tokens: usage.completion_tokens ?? 0, total_tokens: usage.total_tokens ?? 0 } }
      : {}),
  };
}

async function filePartToDataUrl(
  part: Extract<LanguageModelV4Prompt[number]["content"][number], { type?: "file" }> & {
    type: "file";
  }
): Promise<string | null> {
  const mediaType = part.mediaType ?? "image/png";

  if (!mediaType.startsWith("image/")) {
    return null;
  }

  const data = part.data;

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
      messages.push({ role: "system", content: message.content });
      continue;
    }

    if (message.role === "user") {
      const contentParts: Array<Record<string, unknown>> = [];
      const textParts: string[] = [];

      for (const part of message.content) {
        if (part.type === "text") {
          textParts.push(part.text);
        } else if (part.type === "file") {
          const dataUrl = await filePartToDataUrl(part);
          if (dataUrl) {
            contentParts.push({
              type: "image_url",
              image_url: { url: dataUrl },
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
          contentParts.push({ type: "text", text });
        }
        messages.push({ role: "user", content: contentParts });
      } else {
        messages.push({ role: "user", content: textParts.join("\n") });
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
            id: part.toolCallId,
            type: "function",
            function: {
              name: part.toolName,
              arguments:
                typeof part.input === "string"
                  ? part.input
                  : JSON.stringify(part.input ?? {}),
            },
          });
        }
      }

      messages.push({
        role: "assistant",
        content: text.join("") || null,
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
        const output = part.output;

        if (output && typeof output === "object" && "type" in output) {
          if (output.type === "text") {
            resultText = String(
              (output as { value?: unknown }).value ?? ""
            );
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
          role: "tool",
          tool_call_id: part.toolCallId,
          content: resultText,
        });
      }
    }
  }

  return messages;
}

function convertTools(
  options: LanguageModelV4CallOptions
): Array<Record<string, unknown>> | undefined {
  const tools = (options.tools ?? []).filter(
    (tool): tool is LanguageModelV4FunctionTool => tool.type === "function"
  );

  if (tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema ?? { type: "object", properties: {} },
    },
  }));
}

function mapToolChoice(
  options: LanguageModelV4CallOptions
): string | undefined {
  if (!options.tools || options.tools.length === 0) {
    return undefined;
  }

  switch (options.toolChoice?.type) {
    case "none":
      return "none";
    case "required":
      return "required";
    case "tool":
      return "auto";
    case "auto":
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
          part.type === "file" &&
          (part.mediaType ?? "").startsWith("image/")
      )
  );

  return {
    model: modelId,
    max_tokens: options.maxOutputTokens,
    temperature: options.temperature,
    top_p: options.topP,
    stop: options.stopSequences,
    seed: options.seed,
    tools: convertTools(options),
    tool_choice: mapToolChoice(options),
    thinking: { type: "disabled" as const },
    hasImages,
    messagesPromise,
  };
}

function buildToolCallId(index: number, existingId?: string): string {
  return existingId ?? `zai_tool_${index}`;
}

function createSSEStreamParser() {
  let buffer = "";

  return function extractChunks(
    text: string
  ): { chunks: OpenAIChunk[]; done: boolean } {
    buffer += text;
    const chunks: OpenAIChunk[] = [];
    let done = false;

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line || !line.startsWith("data:")) {
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
    specificationVersion: "v4",
    provider: "zai",
    modelId,
    supportedUrls: {},

    async doGenerate(
      options: LanguageModelV4CallOptions
    ): Promise<LanguageModelV4GenerateResult> {
      const base = createBodyBase(options, modelId);
      const messages = await base.messagesPromise;
      const zai = await ZAI.create();

      const body = {
        model: base.model,
        max_tokens: base.max_tokens,
        temperature: base.temperature,
        top_p: base.top_p,
        stop: base.stop,
        seed: base.seed,
        tools: base.tools,
        tool_choice: base.tool_choice,
        thinking: base.thinking,
        messages,
      };

      const completion = base.hasImages
        ? await zai.chat.completions.createVision(body as never)
        : await zai.chat.completions.create(body as never);

      const choice = completion?.choices?.[0];
      const message = choice?.message;

      const content: LanguageModelV4GenerateResult["content"] = [];

      if (message?.content) {
        content.push({ type: "text", text: message.content });
      }

      if (Array.isArray(message?.tool_calls)) {
        for (const toolCall of message.tool_calls) {
          content.push({
            type: "tool-call",
            toolCallId: toolCall.id ?? `zai_tool_${content.length}`,
            toolName: toolCall.function?.name ?? "",
            input: toolCall.function?.arguments ?? "{}",
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
        model: base.model,
        max_tokens: base.max_tokens,
        temperature: base.temperature,
        top_p: base.top_p,
        stop: base.stop,
        seed: base.seed,
        tools: base.tools,
        tool_choice: base.tool_choice,
        thinking: base.thinking,
        messages,
        stream: true,
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
          let textId = "t1";

          const startText = () => {
            if (!textStarted) {
              textStarted = true;
              controller.enqueue({ type: "text-start", id: textId });
            }
          };

          const endText = () => {
            if (textStarted) {
              textStarted = false;
              controller.enqueue({ type: "text-end", id: textId });
            }
          };

          let reasoningStarted = false;

          const startReasoning = () => {
            if (!reasoningStarted) {
              reasoningStarted = true;
              controller.enqueue({ type: "reasoning-start", id: "r1" });
            }
          };

          const endReasoning = () => {
            if (reasoningStarted) {
              reasoningStarted = false;
              controller.enqueue({ type: "reasoning-end", id: "r1" });
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
                  type: "tool-input-end",
                  id: accumulator.id,
                });
              }
              controller.enqueue({
                type: "tool-call",
                toolCallId: accumulator.id,
                toolName: accumulator.name,
                input: accumulator.arguments || "{}",
              });
            }
          };

          const finishAndClose = () => {
            endText();
            endReasoning();
            emitFinalToolCalls();
            controller.enqueue({
              type: "finish",
              finishReason: mapFinishReason(rawFinishReason ?? "stop"),
              usage: mapUsage(rawUsage),
            });
            closeController();
          };

          if (!(upstream instanceof ReadableStream)) {
            // Non-streaming fallback: emit whole payload as text.
            const choice = (upstream as any)?.choices?.[0];
            const content = choice?.message?.content;
            if (typeof content === "string" && content.length > 0) {
              controller.enqueue({ type: "text-start", id: textId });
              controller.enqueue({
                type: "text-delta",
                id: textId,
                delta: content,
              });
              controller.enqueue({ type: "text-end", id: textId });
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
                await reader.cancel().catch(() => undefined);
                endText();
                endReasoning();
                controller.enqueue({
                  type: "finish",
                  finishReason: { unified: "other", raw: "aborted" },
                  usage: mapUsage(rawUsage),
                });
                closeController();
                return;
              }

              const { done, value } = await reader.read();
              if (done) break;

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
                if (!choice) continue;

                if (choice.finish_reason) {
                  rawFinishReason = choice.finish_reason;
                }

                const delta = choice.delta;
                if (!delta) continue;

                if (delta.reasoning_content) {
                  startReasoning();
                  controller.enqueue({
                    type: "reasoning-delta",
                    id: "r1",
                    delta: delta.reasoning_content,
                  });
                }

                if (delta.content) {
                  startText();
                  controller.enqueue({
                    type: "text-delta",
                    id: textId,
                    delta: delta.content,
                  });
                }

                if (Array.isArray(delta.tool_calls)) {
                  for (const toolCall of delta.tool_calls) {
                    const index = toolCall.index ?? 0;
                    let accumulator = toolAccumulators.get(index);

                    if (!accumulator) {
                      accumulator = {
                        id: buildToolCallId(index, toolCall.id),
                        name: toolCall.function?.name ?? "",
                        arguments: "",
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
                        type: "tool-input-start",
                        id: accumulator.id,
                        toolName: accumulator.name,
                      });
                    }

                    if (toolCall.function?.arguments) {
                      accumulator.arguments += toolCall.function.arguments;
                      if (accumulator.started) {
                        controller.enqueue({
                          type: "tool-input-delta",
                          id: accumulator.id,
                          delta: toolCall.function.arguments,
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
            controller.enqueue({ type: "error", error });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "error", raw: "error" },
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
  };
}

export function createZAIProvider() {
  return {
    languageModel(modelId: string) {
      return createZAIModel(modelId);
    },
    chatModel(modelId: string) {
      return createZAIModel(modelId);
    },
  };
}

export const zaiProvider = createZAIProvider();
