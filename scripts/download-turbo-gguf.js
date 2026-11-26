const fs = require("fs");
const path = require("path");
const https = require("https");

const TARGET_DIR = "E:\\Comfy-Desktop\\ComfyUI-Shared\\models\\diffusion_models";
const TARGET_FILE = path.join(TARGET_DIR, "qwen-image-2.1-turbo-Q4_K_M.gguf");
const FILE_URL = "https://huggingface.co/unsloth/Qwen-Image-2.1-Turbo-GGUF/resolve/main/qwen-image-2.1-turbo-Q4_K_M.gguf";

if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Starting download from: ${url}`);
    console.log(`Destination: ${destPath}`);

    const req = https.get(url, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`Redirecting to: ${res.headers.location}`);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${res.statusCode} ${res.statusMessage}`));
      }

      const totalBytes = parseInt(res.headers["content-length"], 10) || 0;
      const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
      console.log(`Total size: ${totalGB} GB (${totalBytes.toLocaleString()} bytes)`);

      const fileStream = fs.createWriteStream(destPath);
      let downloadedBytes = 0;
      let lastReport = 0;
      const startTime = Date.now();

      res.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        const now = Date.now();
        if (now - lastReport > 4000) {
          lastReport = now;
          const percent = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : 0;
          const dlMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
          const elapsedSec = (now - startTime) / 1000;
          const speedMBs = (downloadedBytes / (1024 * 1024) / elapsedSec).toFixed(1);
          console.log(`⏳ Downloaded: ${dlMB} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB (${percent}%) at ${speedMBs} MB/s`);
        }
      });

      res.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close();
        const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n🎉 Download Complete in ${totalSec}s! Saved to: ${destPath}`);
        resolve(destPath);
      });

      fileStream.on("error", (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

downloadFile(FILE_URL, TARGET_FILE)
  .then(() => {
    console.log("Ready to benchmark with UnetLoaderGGUF!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Download error:", err);
    process.exit(1);
  });

