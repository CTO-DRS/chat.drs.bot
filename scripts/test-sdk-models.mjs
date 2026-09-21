import ZAI from "z-ai-web-dev-sdk";

async function testModel(zai, model) {
  try {
    const completion = await zai.chat.completions.create({
      messages: [{ content: "hi, reply with exactly: ok", role: "user" }],
      model,
      thinking: { type: "disabled" },
    });
    const content = completion?.choices?.[0]?.message?.content;
    console.log(`MODEL ${model}: OK -> ${String(content).slice(0, 40)}`);
    return true;
  } catch (e) {
    console.log(`MODEL ${model}: FAIL -> ${String(e?.message).slice(0, 120)}`);
    return false;
  }
}

async function testVision(zai, model) {
  try {
    // 1x1 red pixel PNG
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const completion = await zai.chat.completions.createVision({
      messages: [
        {
          content: [
            { text: "What color is this image? one word", type: "text" },
            { image_url: { url: dataUrl }, type: "image_url" },
          ],
          role: "user",
        },
      ],
      model,
      thinking: { type: "disabled" },
    });
    const content = completion?.choices?.[0]?.message?.content;
    console.log(`VISION ${model}: OK -> ${String(content).slice(0, 60)}`);
    return true;
  } catch (e) {
    console.log(`VISION ${model}: FAIL -> ${String(e?.message).slice(0, 120)}`);
    return false;
  }
}

(async () => {
  const zai = await ZAI.create();
  for (const m of ["glm-4-flash", "glm-4.5-air"]) {
    // biome-ignore lint/performance/noAwaitInLoops: sequential probing with pacing to respect API rate limits
    await testModel(zai, m);
    await new Promise((r) => setTimeout(r, 8000));
  }
  console.log("--- vision ---");
  await testVision(zai, "glm-4.5v");
  await new Promise((r) => setTimeout(r, 8000));
  await testVision(zai, "glm-4v-plus");
})();
