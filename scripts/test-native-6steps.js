const fs = require("fs");

async function testNative6Steps() {
  const connections = JSON.parse(fs.readFileSync("./data/comfyui/connections.json", "utf8"));
  const simpleQwen = connections.connections.find((c) => c.name.includes("Simple Qwen"));
  const wf = JSON.parse(JSON.stringify(simpleQwen.workflowJson));

  wf["unet_gguf"] = {
    class_type: "UnetLoaderGGUF",
    inputs: { unet_name: "qwen_image_2.1_viggle_4step_turbo_Q4_K_M.gguf" },
  };

  wf["459:480"].inputs.model = ["unet_gguf", 0];
  wf["459:453"].inputs.clip_name = "qwen3vl_8b_int8_convrot.safetensors";
  wf["13"].inputs.megapixels = 1.0;

  wf["ref_image"] = {
    class_type: "LoadImage",
    inputs: { image: "Shashi.jpeg" },
  };

  const ultraPrompt = "Cinematic 35mm f/1.4 prime lens photograph, award-winning national geographic documentary style, of the same Indian man sitting on a window seat inside an authentic Indian state bus. He is holding a warm traditional brass and stainless steel tumbler of fresh filter coffee with delicate aromatic steam rising in air. Warm early morning sunrise illuminates his face with soft volumetric rays, revealing hyperrealistic skin texture, fine pores, natural stubble, and crystal-clear reflective eyes with lifelike depth. Weathered turquoise bus interior with authentic metallic window latch, scratched vintage blue seat, and lush South Indian coconut palm greenery softly motion-blurred outside the window. Intricate micro-details, ultra-sharp focus, dynamic range, 8k uhd, clean composition, absolutely no text, no words, no letters, no logos, no watermarks";

  wf["ref_encoder"] = {
    class_type: "TextEncodeQwenImageEdit",
    inputs: {
      clip: ["459:453", 0],
      vae: ["459:454", 0],
      image: ["ref_image", 0],
      prompt: ultraPrompt,
    },
  };

  wf["459:458"].inputs.positive = ["ref_encoder", 0];
  wf["459:458"].inputs.steps = 6;
  wf["459:458"].inputs.cfg = 1.15;
  wf["459:458"].inputs.sampler_name = "euler";
  wf["459:458"].inputs.seed = Math.floor(Math.random() * 2 ** 32);

  wf["461"].inputs.filename_prefix = "abiray-native-6steps";

  console.log("Submitting Native 6-Step Viggle GGUF (No LoRA patch)...");
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
      const imgInfo = h[prompt_id].outputs["461"]?.images?.[0];
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n🎉 Native 6-Step SUCCESS in ${elapsed}s! Output: ${imgInfo?.filename}`);

      const srcPath = `E:\\Comfy-Desktop\\ComfyUI-Shared\\output\\${imgInfo?.filename}`;
      const dstPath = "public/reels/abiray_native_6steps.png";
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
        console.log(`Copied output to: ${dstPath}`);
      }
      return;
    }
  }
}

testNative6Steps().catch(console.error);

