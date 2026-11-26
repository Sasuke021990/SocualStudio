import gguf

for path in [
    r"E:\Comfy-Desktop\ComfyUI-Shared\models\diffusion_models\qwen_image_2.1_viggle_4step_turbo_Q4_K_M.gguf",
    r"E:\Comfy-Desktop\ComfyUI-Shared\models\diffusion_models\qwen-image-2.1-turbo-Q4_K_M.gguf",
    r"E:\Comfy-Desktop\ComfyUI-Shared\models\diffusion_models\qwen-image-2.1-UC-Q6_K.gguf"
]:
    try:
        r = gguf.GGUFReader(path)
        f = r.get_field("general.architecture")
        arch = str(f.parts[f.data[-1]], "utf-8") if f else "None"
        print(f"{path} -> arch: {arch}")
    except Exception as e:
        print(f"{path} -> error: {e}")

