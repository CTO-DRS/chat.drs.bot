import ZAI from "z-ai-web-dev-sdk";

async function testStreaming() {
  console.log("=== TEST 1: Streaming ===");
  const zai = await ZAI.create();
  const body = {
    messages: [
      { role: "assistant", content: "You are a helpful assistant." },
      { role: "user", content: "قل مرحبا بالعربية في جملة قصيرة" },
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
      const { done, value } = await reader.read();
      if (done) break;
      const text = typeof value === "string" ? value : decoder.decode(value);
      chunks++;
      if (chunks <= 5) sample += text;
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
      { role: "assistant", content: "You are a helpful assistant." },
      { role: "user", content: "What is the weather like in San Francisco?" },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "getWeather",
          description: "Get the current weather for a location",
          parameters: {
            type: "object",
            properties: {
              latitude: { type: "number" },
              longitude: { type: "number" },
              city: { type: "string" },
            },
            required: ["latitude", "longitude", "city"],
          },
        },
      },
    ],
    tool_choice: "auto",
    thinking: { type: "disabled" },
  };
  try {
    const completion = await zai.chat.completions.create(body);
    const msg = completion?.choices?.[0]?.message;
    console.log("finish_reason:", completion?.choices?.[0]?.finish_reason);
    console.log("content:", JSON.stringify(msg?.content)?.slice(0, 200));
    console.log("tool_calls:", JSON.stringify(msg?.tool_calls, null, 2)?.slice(0, 800));
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
      { role: "assistant", content: "You are a helpful assistant." },
      { role: "user", content: "Create a document titled 'hello' with content 'world'" },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "createDocument",
          description: "Create a document",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ["title", "content"],
          },
        },
      },
    ],
    tool_choice: "auto",
    stream: true,
    thinking: { type: "disabled" },
  };
  try {
    const result = await zai.chat.completions.create(body);
    if (result instanceof ReadableStream || result?.getReader) {
      const reader = result.getReader();
      const decoder = new TextDecoder();
      let all = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = typeof value === "string" ? value : decoder.decode(value);
        all += text;
      }
      // Find lines mentioning tool_calls
      const lines = all.split("\n").filter(Boolean);
      console.log("total SSE lines:", lines.length);
      const toolLines = lines.filter((l) => l.includes("tool_call"));
      console.log("tool_call lines:", toolLines.length);
      console.log("sample tool lines:", toolLines.slice(0, 4).join("\n").slice(0, 1200));
      console.log("---last 3 lines---");
      console.log(lines.slice(-3).join("\n").slice(0, 800));
    } else {
      console.log("stream tool: non-stream result:", JSON.stringify(result).slice(0, 600));
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
