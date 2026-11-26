const fs = require("fs");

async function runIndianBusCoffee() {
  const connections = JSON.parse(fs.readFileSync("./data/comfyui/connections.json", "utf8"));
  const simpleQwen = connections.connections.find((c) => c.name.includes("Simple Qwen"));
  const wf = JSON.parse(JSON.stringify(simpleQwen.workflowJson));

  // Determine reference image (Shashi.jpeg if available, else freckled_curly_girl.png)
  const refImageName = fs.existsSync("E:\\Comfy-Desktop\\ComfyUI-Shared\\input\\Shashi.jpeg")
    ? "Shashi.jpeg"
    : "freckled_curly_girl.png";

  console.log(`Using reference image: ${refImageName}`);

  const promptText = "Cinematic medium portrait of the same person sitting on a window seat inside a moving Indian bus, holding a hot steel tumbler of coffee with gentle steam rising, morning golden sunlight streaming through the window casting warm natural highlights on their face, lush green countryside blurred in background outside the glass, authentic Indian bus interior with metal safety bars and vintage seat, peaceful relaxed smile, 35mm film still, photorealistic, clean composition, absolutely no text, no words, no letters, no logos, no watermarks";

  wf["ref_image"] = {
    class_type: "LoadImage",
    inputs: { image: refImageName },
  };

  wf["ref_encoder"] = {
    class_type: "TextEncodeQwenImageEdit",
    inputs: {
      clip: ["459:453", 0],
      vae: ["459:454", 0],
      image: ["ref_image", 0],
      prompt: promptText,
    },
  };

  wf["459:458"].inputs.positive = ["ref_encoder", 0];
  wf["459:458"].inputs.steps = 8;
  wf["459:458"].inputs.cfg = 1;
  wf["459:458"].inputs.seed = Math.floor(Math.random() * 2 ** 32);
  wf["461"].inputs.filename_prefix = "indian-bus-coffee";

  console.log("Submitting prompt to ComfyUI on AMD GPU...");
  console.log(`Prompt: "${promptText}"`);

  const res = await fetch("http://127.0.0.1:8188/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf }),
  });

  if (!res.ok) {
    throw new Error(`ComfyUI error: ${res.status} ${await res.text()}`);
  }

  const { prompt_id } = await res.json();
  console.log(`Queued prompt ID: ${prompt_id}. Generating image...`);

  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    await new Promise((r) => setTimeout(r, 2000));
    const hRes = await fetch(`http://127.0.0.1:8188/history/${prompt_id}`);
    if (!hRes.ok) continue;
    const h = await hRes.json();
    if (h[prompt_id]?.outputs) {
      const imgInfo = h[prompt_id].outputs["461"]?.images?.[0];
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`✅ SUCCESS in ${elapsed}s! Output: ${imgInfo?.filename}`);

      // Copy to public folder
      const srcPath = `E:\\Comfy-Desktop\\ComfyUI-Shared\\output\\${imgInfo?.filename}`;
      const dstPath = "public/reels/indian_bus_coffee.png";
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
        console.log(`Copied to: ${dstPath}`);
      }
      return;
    }
  }
}

runIndianBusCoffee().catch(console.error);

