const fs = require("fs");

async function testTurboRefFast() {
  const connections = JSON.parse(fs.readFileSync("./data/comfyui/connections.json", "utf8"));
  const simpleQwen = connections.connections.find((c) => c.name.includes("Simple Qwen"));
  const wf = JSON.parse(JSON.stringify(simpleQwen.workflowJson));

  // 1. Switch to the TURBO model for ultra-sharp 8-step details
  wf["459:451"].inputs.unet_name = "qwen_image_2.1_turbo_int8_convrot.safetensors";

  // 2. Calibrate resolution to 1.0 Megapixels (1024x1024) for sub-15s execution
  wf["13"].inputs.megapixels = 1.0;

  // 3. Inject reference image
  wf["ref_image"] = {
    class_type: "LoadImage",
    inputs: { image: "Shashi.jpeg" },
  };

  // 4. Ultra-detailed prompt with texture, camera lens, and volumetric lighting cues
  const detailedPrompt = "Cinematic candid masterpiece photograph of the same person sitting on a window seat inside a moving Indian bus, holding a hot steel tumbler of south Indian filter coffee, aromatic steam rising visibly. Crisp morning golden hour sunlight streaming through the window creating volumetric light beams and soft lens flare, highlighting fine natural facial skin pores, realistic eyes, and subtle hair strands. Authentic Indian state transport bus interior with scratched blue vinyl seats and weathered chrome safety rails, lush emerald green village scenery with coconut trees softly motion-blurred outside the window. Shot on 35mm f/1.8 lens, shallow depth of field, hyperrealistic texture, 8k resolution, clean composition, absolutely no text, no words, no letters, no logos, no watermarks";

  wf["ref_encoder"] = {
    class_type: "TextEncodeQwenImageEdit",
    inputs: {
      clip: ["459:453", 0],
      vae: ["459:454", 0],
      image: ["ref_image", 0],
      prompt: detailedPrompt,
    },
  };

  // 5. Connect KSampler
  wf["459:458"].inputs.positive = ["ref_encoder", 0];
  wf["459:458"].inputs.steps = 8;
  wf["459:458"].inputs.cfg = 1;
  wf["459:458"].inputs.sampler_name = "euler";
  wf["459:458"].inputs.seed = Math.floor(Math.random() * 2 ** 32);
  wf["461"].inputs.filename_prefix = "indian-bus-turbo-fast";

  console.log("Submitting Optimized Turbo 1.0MP Reference prompt to ComfyUI...");
  const t0 = Date.now();
  const res = await fetch("http://127.0.0.1:8188/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf }),
  });

  if (!res.ok) {
    throw new Error(`ComfyUI error: ${res.status} ${await res.text()}`);
  }

  const { prompt_id } = await res.json();
  console.log(`Queued prompt ID: ${prompt_id}. Waiting for AMD GPU...`);

  while (Date.now() - t0 < 60000) {
    await new Promise((r) => setTimeout(r, 1000));
    const hRes = await fetch(`http://127.0.0.1:8188/history/${prompt_id}`);
    if (!hRes.ok) continue;
    const h = await hRes.json();
    if (h[prompt_id]?.outputs) {
      const imgInfo = h[prompt_id].outputs["461"]?.images?.[0];
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n🎉 SUCCESS in ${elapsed}s! Output: ${imgInfo?.filename}`);

      const srcPath = `E:\\Comfy-Desktop\\ComfyUI-Shared\\output\\${imgInfo?.filename}`;
      const dstPath = "public/reels/indian_bus_turbo_detailed.png";
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
        console.log(`Copied high-detail image to: ${dstPath}`);
      }
      return;
    }
  }
}

testTurboRefFast().catch(console.error);

