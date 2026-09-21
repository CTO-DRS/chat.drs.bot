import ZAI from "z-ai-web-dev-sdk";

async function testStreaming() {
  console.log("=== TEST 1: Streaming ===");
  const zai = await ZAI.create();
  const body = {
    messages: [
      { content: "You are a helpful assistant.", role: "assistant" },
      { content: "قل مرحبا بالعربية في جملة قصيرة", role: "user" },
    ],
    stream: true,
    thinking: { type: "disabled" },
  };
  const result = await zai.chat.completions.create(body);
  console.log("stream result type:", typeof result, result?.constructor?.name);
  if (result instanceof ReadableStream || result?.getReader) {
    const reader = result.getReader();
    const decoder = new TextDecoder();
    let chunks = 0;
    let sample = "";
    while (true) {
      // biome-ignore lint/performance/noAwaitInLoops: stream chunks must be read sequentially
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const text = typeof value === "string" ? value : decoder.decode(value);
      chunks += 1;
      if (chunks <= 5) {
        sample += text;
      }
    }
    console.log("total chunks:", chunks);
    console.log("sample first chunks:\n", sample.slice(0, 1500));
  } else {
    console.log("non-stream object:", JSON.stringify(result).slice(0, 800));
  }
}

async function testToolCalling() {
  console.log("\n=== TEST 2: Tool Calling (non-stream) ===");
  const zai = await ZAI.create();
  const body = {
    messages: [
      { content: "You are a helpful assistant.", role: "assistant" },
      { content: "What is the weather like in San Francisco?", role: "user" },
    ],
    thinking: { type: "disabled" },
    tool_choice: "auto",
    tools: [
      {
        function: {
          description: "Get the current weather for a location",
          name: "getWeather",
          parameters: {
            properties: {
              city: { type: "string" },
              latitude: { type: "number" },
              longitude: { type: "number" },
            },
            required: ["latitude", "longitude", "city"],
            type: "object",
          },
        },
        type: "function",
      },
    ],
  };
  try {
    const completion = await zai.chat.completions.create(body);
    const msg = completion?.choices?.[0]?.message;
    console.log("finish_reason:", completion?.choices?.[0]?.finish_reason);
    console.log("content:", JSON.stringify(msg?.content)?.slice(0, 200));
    console.log(
      "tool_calls:",
      JSON.stringify(msg?.tool_calls, null, 2)?.slice(0, 800)
    );
    console.log("usage:", JSON.stringify(completion?.usage));
  } catch (e) {
    console.log("tool call ERROR:", e?.message?.slice(0, 500));
  }
}

async function testToolCallingStream() {
  console.log("\n=== TEST 3: Tool Calling (stream) ===");
  const zai = await ZAI.create();
  const body = {
    messages: [
      { content: "You are a helpful assistant.", role: "assistant" },
      {
        content: "Create a document titled 'hello' with content 'world'",
        role: "user",
      },
    ],
    stream: true,
    thinking: { type: "disabled" },
    tool_choice: "auto",
    tools: [
      {
        function: {
          description: "Create a document",
          name: "createDocument",
          parameters: {
            properties: {
              content: { type: "string" },
              title: { type: "string" },
            },
            required: ["title", "content"],
            type: "object",
          },
        },
        type: "function",
      },
    ],
  };
  try {
    const result = await zai.chat.completions.create(body);
    if (result instanceof ReadableStream || result?.getReader) {
      const reader = result.getReader();
      const decoder = new TextDecoder();
      let all = "";
      while (true) {
        // biome-ignore lint/performance/noAwaitInLoops: stream chunks must be read sequentially
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const text = typeof value === "string" ? value : decoder.decode(value);
        all += text;
      }
      // Find lines mentioning tool_calls
      const lines = all.split("\n").filter(Boolean);
      console.log("total SSE lines:", lines.length);
      const toolLines = lines.filter((l) => l.includes("tool_call"));
      console.log("tool_call lines:", toolLines.length);
      console.log(
        "sample tool lines:",
        toolLines.slice(0, 4).join("\n").slice(0, 1200)
      );
      console.log("---last 3 lines---");
      console.log(lines.slice(-3).join("\n").slice(0, 800));
    } else {
      console.log(
        "stream tool: non-stream result:",
        JSON.stringify(result).slice(0, 600)
      );
    }
  } catch (e) {
    console.log("stream tool ERROR:", e?.message?.slice(0, 500));
  }
}

(async () => {
  await testStreaming().catch((e) => console.log("T1 ERR:", e.message));
  await testToolCalling().catch((e) => console.log("T2 ERR:", e.message));
  await testToolCallingStream().catch((e) => console.log("T3 ERR:", e.message));
})();
