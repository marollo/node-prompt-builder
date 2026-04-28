## Basic model info

Model name: qwen/qwen-edit-multiangle
Model description: Camera-aware edits for Qwen/Qwen-Image-Edit-2509 with Lightning + multi-angle LoRA


## Model inputs

- image (required): Image file uploaded to Cog (jpeg, png, gif, or webp). (string)
- prompt (optional): Optional text instruction appended after the camera directive. (string)
- rotate_degrees (optional): Camera rotation in degrees. Positive rotates left, negative rotates right. (integer)
- move_forward (optional): Move the camera forward (zoom in). Higher values push toward a close-up framing. (integer)
- vertical_tilt (optional): Vertical camera tilt. -1 = bird's-eye, 0 = level, 1 = worm's-eye. (integer)
- use_wide_angle (optional): Switch to a wide-angle lens instruction. (boolean)
- aspect_ratio (optional): Aspect ratio for the generated image (string)
- go_fast (optional): If num_inference_steps is omitted, true runs the 4-step fast preset and false runs the 40-step detailed preset. (boolean)
- num_inference_steps (optional): Explicit denoising step count (1-40). Leave blank to use the go_fast presets (4 or 40 steps). (integer)
- lora_weights (optional): LoRA weights to apply. Pass a Hugging Face repo slug like 'dx8152/Qwen-Edit-2509-Multiple-angles' or a direct .safetensors/zip/tar URL (for example, 'https://huggingface.co/flymy-ai/qwen-image-lora/resolve/main/pytorch_lora_weights.safetensors', 'https://example.com/lora_weights.tar.gz', or 'https://example.com/lora_weights.zip'). (string)
- lora_scale (optional): Strength applied to the selected LoRA. (number)
- true_guidance_scale (optional): True classifier-free guidance scale passed to the pipeline. (number)
- seed (optional): Random seed. Set for reproducible generation. (integer)
- output_format (optional): Format of the output images. (string)
- output_quality (optional): Quality when saving the output images, from 0 to 100. 100 is best quality, 0 is lowest quality. Not relevant for .png outputs. (integer)
- disable_safety_checker (optional): Disable safety checker for generated images. (boolean)


## Model output schema

{
  "type": "array",
  "items": {
    "type": "string",
    "format": "uri"
  },
  "title": "Output"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/dqq601chx9rm80ctc2kv9nx6vw)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/O1UQS12xPzGf3DDVE39bxb5fJpn6w9nHMeMOvQGGJa37BRxK/monkkk.png",
  "prompt": "",
  "go_fast": true,
  "aspect_ratio": "match_input_image",
  "move_forward": 0,
  "output_format": "webp",
  "vertical_tilt": 0,
  "output_quality": 95,
  "rotate_degrees": 56,
  "use_wide_angle": false,
  "use_multiple_angles": true,
  "multiple_angles_strength": 1
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/Ol6fgCJX6wWXPKALHYItYfgFvhlc2Tm5wuYp2QdekZh3eMcWB/out-0.webp"
]
```


### Example (https://replicate.com/p/6bha74g5a9rm80ctc3vs1yvyt0)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/O1VysJqPUg8fgHm1By55mcSGCZngyhwYTaIfUn2OLqpwfaJ3/wednesday.png",
  "prompt": "",
  "go_fast": true,
  "aspect_ratio": "match_input_image",
  "move_forward": 2,
  "output_format": "webp",
  "vertical_tilt": -1,
  "output_quality": 95,
  "rotate_degrees": 45,
  "use_wide_angle": false,
  "use_multiple_angles": true,
  "multiple_angles_strength": 1
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/gejz3J2YED0BS6FehCQ2zFd3Ko0A5he4LMKxyyT0cCBU6IOrA/out-0.webp"
]
```


### Example (https://replicate.com/p/fz5g7zmt61rma0ctdwevkynmc4)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/O1W5PaLjEt69eCt8VsKREQTtoh2t8dBhfT8mU839T0wTfpaw/capy.webp",
  "prompt": "",
  "go_fast": false,
  "aspect_ratio": "match_input_image",
  "move_forward": 0,
  "output_format": "webp",
  "vertical_tilt": 0,
  "output_quality": 95,
  "rotate_degrees": 90,
  "use_wide_angle": false,
  "true_guidance_scale": 1,
  "use_multiple_angles": true,
  "multiple_angles_strength": 1.25
}
```

#### Output

```json
[
  "https://replicate.delivery/xezq/V6svTHBjIWqhN5EDRxM4Jnpf20XIHXAVPjjfinHhkfwF38PrA/out-0.webp"
]
```


## Model readme

> # Qwen Image Edit 2509 – Multi‑Angle LoRA Edition
> 
> Camera-aware image editing built on Qwen/Qwen-Image-Edit-2509 with the Lightning adapter and the dx8152 multi-angle LoRA fused in by default. A single upload plus a few camera sliders are enough to rotate, tilt, or zoom the virtual camera while keeping subjects, lighting, and texture consistent.
> 
> ———
> 
> ## What it does
> 
> - Accepts one source image (portrait, product, or scene) and optional text.
> - Generates a camera instruction from four sliders—rotate_degrees, move_forward, vertical_tilt, use_wide_angle.
> - Runs Qwen Image Edit 2509 in Lightning mode with the multi-angle LoRA enabled, so edits respect the implied camera move rather than hallucinating new content.
> - Lets you add extra prompt text if you need style tweaks, lighting changes, etc.
> 
> The same pipeline can fall back to the 40-step base model (set go_fast=false) or disable the multi-angle adapter entirely (use_multiple_angles=false or multiple_angles_strength=0) when you just want a vanilla Qwen edit.
> 
> ———
> 
> ## Key camera features
> 
> ### Multi-angle LoRA baked in
> 
> The pipeline loads the dx8152 Qwen-Edit-2509-Multiple-angles LoRA at weight 1.0. Combined with Lightning, it excels at smooth orbital moves, dolly zooms, and subtle tilt adjustments.
> 
> ### Four intuitive controls
> 
> | Control          | Effect                                                                                 |
> |------------------|----------------------------------------------------------------------------------------|
> | rotate_degrees   | Positive = rotate left, negative = rotate right (±180°).                              |
> | move_forward     | Push-in / zoom; higher values move the camera closer.                                 |
> | vertical_tilt    | -1 = top-down, 0 = eye level, +1 = low-angle hero shot.                               |
> | use_wide_angle   | Toggles a wide lens instruction for exaggerated perspective.                          |
> 
> These build a bilingual (Chinese + English) camera directive that’s prepended to your prompt automatically. If you leave the prompt blank, the camera instruction alone drives the edit.
> 
> Lightning by default has go_fast true out of the box, so it handles denoising in 8 steps with LoRAs attached. Turn it off to run the 40-step base model with CFG 4.0 if you need the original slower look.
> 
> ———
> 
> ## Inputs (API / Playground)
> 
> - **image** (Path, required) – single image upload (jpeg/png/gif/webp).
> - **prompt** (optional) – extra styling or content guidance appended after the camera instruction.
> - **rotate_degrees, move_forward, vertical_tilt, use_wide_angle** – the camera sliders described above.
> - **aspect_ratio** – choose from presets (match_input_image, 1:1, 16:9, etc.). We pass width/height to the pipeline for you.
> - **go_fast** – Lightning + LoRA fast path (default true).
> - **use_multiple_angles** – keep it true to apply the multi-angle LoRA. Set to false to drop back to Lightning only.
> - **multiple_angles_strength** – scale the LoRA weight (0–2). 0 effectively disables the adapter while keeping use_multiple_angles on.
> - **seed** – optional RNG seed for reproducible edits.
> - **output_format, output_quality** – choose webp, jpg, or png (quality applies to non-PNG formats).
> - **disable_safety_checker** – leave at false; we run both Stable Diffusion and Falcon NSFW checks by default.
> 
> ———
> 
> ## Example workflows
> 
> 1. Rotate around a subject  
>    `image=@portrait.png rotate_degrees=30 move_forward=2 vertical_tilt=0 use_wide_angle=false prompt="keep lighting warm, add gentle rim light"`
> 
> 2. Low-angle hero shot with wide lens  
>    `image=@product.png rotate_degrees=-15 move_forward=3 vertical_tilt=1 use_wide_angle=true prompt="dramatic studio lighting with coloured gels"`
> 
> 3. Baseline Qwen edit (no LoRA)  
>    `go_fast=false use_multiple_angles=false prompt="convert to watercolour illustration style"`
> 
> ———
> 
> ## Tips for best results
> 
> - Start with the camera sliders before touching the prompt; most edits need no extra text.
> - Keep go_fast=true for the multi-angle look—Lightning + LoRA were tuned together.
> - Use multiple_angles_strength between 0.8 and 1.3 to fine-tune how strongly the camera move shows up.
> - When you do add a prompt, use concise instructions like “add warm sunset light” or “switch to cinematic film grain.”
> - Portraits respond especially well to small pitch (vertical_tilt) and roll (rotate_degrees) adjustments; avoid extreme values unless you want stylised distortion.
> - For product shots, combine move_forward with use_wide_angle=true to mimic a close-up lens while keeping proportions believable.
> 
> ———
> 
> ## References
> 
> - Base model: Qwen/Qwen-Image-Edit-2509 (https://huggingface.co/Qwen/Qwen-Image-Edit-2509)
> - Multi-angle LoRA: dx8152/Qwen-Edit-2509-Multiple-angles (https://huggingface.co/dx8152/Qwen-Edit-2509-Multiple-angles)

