const fs = require("fs");

async function testScene2() {
  const connections = JSON.parse(fs.readFileSync("./data/comfyui/connections.json", "utf8"));
  const simpleQwen = connections.connections.find((c) => c.name.includes("Simple Qwen"));
  const wf = JSON.parse(JSON.stringify(simpleQwen.workflowJson));

  wf["ref_image"] = {
    class_type: "LoadImage",
    inputs: { image: "freckled_curly_girl.png" },
  };

  wf["ref_encoder"] = {
    class_type: "TextEncodeQwenImageEdit",
    inputs: {
      clip: ["459:453", 0],
      vae: ["459:454", 0],
      image: ["ref_image", 0],
      prompt: "The same young woman standing inside a moving city subway train at night, holding handrail, soft reflections on glass window, cinematic moody lighting, clean 35mm photography, no text, no logo",
    },
  };

  wf["459:458"].inputs.positive = ["ref_encoder", 0];
  wf["459:458"].inputs.steps = 8;
  wf["459:458"].inputs.cfg = 1;
  wf["459:458"].inputs.seed = Math.floor(Math.random() * 2 ** 32);
  wf["461"].inputs.filename_prefix = "qwen21-ref-spike";

  console.log("Submitting Scene 2 (Subway)...");
  const res = await fetch("http://127.0.0.1:8188/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf }),
  });

  const { prompt_id } = await res.json();
  console.log("Queued Scene 2 prompt ID:", prompt_id);

  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    await new Promise((r) => setTimeout(r, 1500));
    const hRes = await fetch(`http://127.0.0.1:8188/history/${prompt_id}`);
    if (!hRes.ok) continue;
    const h = await hRes.json();
    if (h[prompt_id]?.outputs) {
      console.log("SUCCESS Scene 2! Elapsed:", ((Date.now() - t0)/1000).toFixed(1), "s. Output:", JSON.stringify(h[prompt_id].outputs["461"]?.images));
      return;
    }
  }
}

testScene2().catch(console.error);

