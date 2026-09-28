## Basic model info

Model name: recraft-ai/recraft-v4.1
Model description: Recraft's latest image generation model, built around design taste. Strong prompt accuracy, art-directed composition, and integrated text rendering. Fast and cost-efficient at standard resolution.


## Model inputs

- prompt (required): Text prompt for image generation (up to 10,000 characters) (string)
- aspect_ratio (optional): Aspect ratio of the generated image (string)
- size (optional): Width and height of the generated image. Size is ignored if an aspect ratio is set. (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/kvyz7w1r49rmr0cy33kts4782g)

#### Input

```json
{
  "size": "1024x1024",
  "prompt": "A brutalist concrete library interior at golden hour \u2014 shafts of amber light cut through narrow slit windows and fall across tiered balconies lined with thousands of identical navy-blue hardcover books. A single reader sits far below in a pool of direct light, dwarfed by the scale of the structure. Dust motes suspended mid-air. The raw concrete has been stained by decades of humidity into abstract watercolor-like gradients of ochre and grey. Shot with a wide-angle tilt-shift lens from above, architectural photography.",
  "aspect_ratio": "Not set"
}
```

#### Output

```json
"https://replicate.delivery/xezq/LtMVipv4GMYlDV3odInBXwSk8fdRoWfJBBYV6LGMTybEmfHtA/tmp_yfy89bq.webp"
```


## Model readme

> ## Overview
> 
> Recraft V4.1 is an updated version of Recraft V4, focused on visual taste, prompt accuracy, and output quality. Where most image models optimize for broad general preference, V4.1 was developed in close collaboration with designers and tuned around design aesthetics and professional expectations.
> 
> The core idea behind V4.1 is "design taste" — the model makes intentional visual decisions about composition, lighting, color relationships, and material realism. The result is images that feel art-directed rather than stock-like, even from simple prompts.
> 
> V4.1 comes in two versions: **V4.1** (this model) and **V4.1 Pro**. Both share the same creative capabilities and design taste. The difference is resolution and speed — V4.1 generates images at standard resolution (~1024px) making it ideal for everyday work and fast iteration. V4.1 Pro generates higher-resolution images (~2048px) for print-ready assets.
> 
> ## Features
> 
> - **Design taste in every output.** V4.1 makes aesthetic decisions about how elements are arranged, how colors interact, and where the eye moves. Images feel intentional and art-directed, not generic.
> - **Strong prompt accuracy.** Whether your prompt is a few words or a detailed paragraph (up to 10,000 characters), V4.1 follows it closely while maintaining visual coherence.
> - **Integrated text rendering.** Typography is treated as a structural part of the composition, not just an overlay. Text interacts with the scene — bridging visual elements, responding to spatial context, and fitting naturally into the design.
> - **Production-ready outputs.** Images are designed to be usable across digital, print, and brand systems — product shots, editorial photography, posters, packaging, and more.
> - **Multiple aspect ratios.** Generate in 1:1, 4:3, 3:2, 16:9, 9:16, and other common ratios.
> 
> ## When to use V4.1 vs. V4.1 Pro
> 
> - **V4.1** (this model): Fast iteration, social media, web assets, concept exploration.
> - **V4.1 Pro**: Print production, large-format work, high-detail output.
> 
> Both produce the same art-directed quality — the difference is resolution.
> 
> ## Licensing and commercial use
> 
> Images generated on Replicate with Recraft V4.1 can be used commercially. See [Recraft's terms](https://www.recraft.ai/terms) for details.

