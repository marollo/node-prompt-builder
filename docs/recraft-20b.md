## Basic model info

Model name: recraft-ai/recraft-20b
Model description: Affordable and fast images


## Model inputs

- aspect_ratio (optional): Aspect ratio of the generated image (string)
- size (optional): Width and height of the generated image. Size is ignored if an aspect ratio is set. (string)
- style (optional): Style of the generated image. (string)
- prompt (required): Text prompt for image generation (string)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/c3hzfr24b9rgc0ckqd18w4b8hm)

#### Input

```json
{
  "size": "1024x1024",
  "style": "realistic_image/studio_portrait",
  "prompt": "a portrait photo"
}
```

#### Output

```json
"https://replicate.delivery/czjl/jRwIA3AnT7YAKZHCtE93qBfOvOe79237KgrZuR0N8eDOiU0nA/tmp7lxrpqpn.webp"
```


### Example (https://replicate.com/p/6a284pknp5rg80ckqd9vb57t3r)

#### Input

```json
{
  "size": "1024x1024",
  "style": "realistic_image/b_and_w",
  "prompt": "a portrait photo"
}
```

#### Output

```json
"https://replicate.delivery/czjl/ktMwWoliJ6K2Bx8IVQO0xAEujmdERpkAdid7ZAHCbFZqoieJA/tmpe5t63bfy.webp"
```


## Model readme

> No readme available for this model.

