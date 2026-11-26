const fs = require("fs");

async function testQwenRef() {
  const connections = JSON.parse(fs.readFileSync("./data/comfyui/connections.json", "utf8"));
  const simpleQwen = connections.connections.find((c) => c.name.includes("Simple Qwen"));
  if (!simpleQwen) throw new Error("Simple Qwen not found");

  const wf = JSON.parse(JSON.stringify(simpleQwen.workflowJson));

  // Add LoadImage for reference character
  wf["ref_image"] = {
    class_type: "LoadImage",
    inputs: {
      image: "freckled_curly_girl.png",
    },
  };

  // Add TextEncodeQwenImageEdit
  wf["ref_encoder"] = {
    class_type: "TextEncodeQwenImageEdit",
    inputs: {
      clip: ["459:453", 0], // qwen3vl CLIP loader
      vae: ["459:454", 0],  // VAE loader
      image: ["ref_image", 0],
      prompt: "A young woman smiling in a modern cafe holding a coffee mug, warm afternoon sunlight, clean photography, no text, no logo",
    },
  };

  // Connect KSampler positive conditioning to ref_encoder
  wf["459:458"].inputs.positive = ["ref_encoder", 0];
  // 8 steps, cfg 1
  wf["459:458"].inputs.steps = 8;
  wf["459:458"].inputs.cfg = 1;
  wf["459:458"].inputs.seed = Math.floor(Math.random() * 2 ** 32);

  // Set SaveImage prefix
  wf["461"].inputs.filename_prefix = "qwen21-ref-spike";

  console.log("Submitting Qwen2.1 Reference Workflow to ComfyUI...");
  const res = await fetch("http://127.0.0.1:8188/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("ComfyUI prompt error:", res.status, err);
    return;
  }

  const { prompt_id } = await res.json();
  console.log("Queued prompt ID:", prompt_id);

  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await new Promise((r) => setTimeout(r, 1500));
    const hRes = await fetch(`http://127.0.0.1:8188/history/${prompt_id}`);
    if (!hRes.ok) continue;
    const h = await hRes.json();
    if (h[prompt_id]?.outputs) {
      console.log("SUCCESS! Output images:", JSON.stringify(h[prompt_id].outputs));
      return;
    }
  }
  console.log("Timed out waiting for history.");
}

testQwenRef().catch(console.error);

