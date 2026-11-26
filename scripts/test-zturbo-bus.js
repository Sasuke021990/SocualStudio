const fs = require("fs");

async function testZTurboBus() {
  const connections = JSON.parse(fs.readFileSync("./data/comfyui/connections.json", "utf8"));
  const zturbo = connections.connections.find((c) => c.name.includes("Z Image Turbo"));
  const wf = JSON.parse(JSON.stringify(zturbo.workflowJson));

  wf["57:13"].inputs.width = 1024;
  wf["57:13"].inputs.height = 1024;
  wf["57:3"].inputs.steps = 8;
  wf["57:3"].inputs.cfg = 1;
  wf["57:3"].inputs.seed = Math.floor(Math.random() * 2 ** 32);

  const promptText = "Cinematic candid masterpiece photograph of a young Indian man sitting on a window seat inside a moving Indian bus, holding a hot steel tumbler of south Indian filter coffee, aromatic steam rising visibly. Crisp morning golden hour sunlight streaming through the window creating volumetric light beams and soft lens flare, highlighting fine natural facial skin pores, realistic eyes, and subtle hair strands. Authentic Indian state transport bus interior with scratched blue vinyl seats and weathered chrome safety rails, lush emerald green village scenery with coconut trees softly motion-blurred outside the window. Shot on 35mm f/1.8 lens, shallow depth of field, hyperrealistic texture, 8k resolution, clean composition, absolutely no text, no words, no letters, no logos, no watermarks";

  wf["57:27"].inputs.text = promptText;
  wf["9"].inputs.filename_prefix = "zturbo-bus-fast";

  console.log("Submitting Z Image Turbo to ComfyUI...");
  const t0 = Date.now();
  const res = await fetch("http://127.0.0.1:8188/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf }),
  });

  const { prompt_id } = await res.json();
  console.log(`Queued prompt ID: ${prompt_id}`);

  while (Date.now() - t0 < 60000) {
    await new Promise((r) => setTimeout(r, 1000));
    const hRes = await fetch(`http://127.0.0.1:8188/history/${prompt_id}`);
    if (!hRes.ok) continue;
    const h = await hRes.json();
    if (h[prompt_id]?.outputs) {
      const imgInfo = h[prompt_id].outputs["9"]?.images?.[0];
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n🎉 Z Turbo SUCCESS in ${elapsed}s! Output: ${imgInfo?.filename}`);

      const srcPath = `E:\\Comfy-Desktop\\ComfyUI-Shared\\output\\${imgInfo?.filename}`;
      const dstPath = "public/reels/zturbo_bus_detailed.png";
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
        console.log(`Copied Z Turbo detailed image to: ${dstPath}`);
      }
      return;
    }
  }
}

testZTurboBus().catch(console.error);

