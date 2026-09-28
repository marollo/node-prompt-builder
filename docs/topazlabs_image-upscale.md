## Basic model info

Model name: topazlabs/image-upscale
Model description: Professional-grade image upscaling, from Topaz Labs


## Model inputs

- image (required): Image to enhance (string)
- enhance_model (optional): Model to use: Standard V2 (general purpose), Low Resolution V2 (for low-res images), CGI (for digital art), High Fidelity V2 (preserves details), Text Refine (optimized for text) (string)
- upscale_factor (optional): How much to upscale the image (string)
- output_format (optional): Output format (string)
- subject_detection (optional): Subject detection (string)
- face_enhancement (optional): Enhance faces in the image (boolean)
- face_enhancement_creativity (optional): Choose the level of creativity for face enhancement from 0 to 1. Defaults to 0, and is ignored if face_enhancement is false. (number)
- face_enhancement_strength (optional): Control how sharp the enhanced faces are relative to the background from 0 to 1. Defaults to 0.8, and is ignored if face_enhancement is false. (number)


## Model output schema

{
  "type": "string",
  "title": "Output",
  "format": "uri"
}

If the input or output schema includes a format of URI, it is referring to a file.


## Example inputs and outputs

Use these example outputs to better understand the types of inputs the model accepts, and the types of outputs the model returns:

### Example (https://replicate.com/p/sxqdnd1d7xrma0cpdes9ef9fc8)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/Mtfss8QN14MF5lEERiMeVlxcneNfm8GEGd5A0IKbc2Ks4oi2/topaz.png",
  "enhance_model": "CGI",
  "output_format": "jpg",
  "upscale_factor": "2x",
  "face_enhancement": false,
  "subject_detection": "None",
  "face_enhancement_strength": 0.8,
  "face_enhancement_creativity": 0
}
```

#### Output

```json
"https://replicate.delivery/xezq/MzHCyd650VZ0Cx6ZID7YFU7WGg1J579C4ecwkhuvMH8DEHTKA/tmp9lnlmaoj.jpg"
```


### Example (https://replicate.com/p/2b7abzyx1hrmc0cpdp6rz8mvjg)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/MtnpGxNIVJlHAMZmQNl5bLARbYpiLahniAYis3RsRN2KwhfJ/out-1.webp",
  "enhance_model": "Low Resolution V2",
  "output_format": "jpg",
  "upscale_factor": "4x",
  "face_enhancement": true,
  "subject_detection": "Foreground",
  "face_enhancement_strength": 0.8,
  "face_enhancement_creativity": 0.5
}
```

#### Output

```json
"https://replicate.delivery/xezq/vXJDANfas80BdCZbLh06VSfeTtWCxdCB3TjgsVyxl0h5brMpA/tmp1orc4ro2.jpg"
```


### Example (https://replicate.com/p/c4bkfjywb9rme0cpdpctcfscxr)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/Mto1gRxfYByMDzlSH8TdQXWbUVd8e5QMCyBcsolttP3oUJwF/0_0.jpg",
  "enhance_model": "CGI",
  "output_format": "jpg",
  "upscale_factor": "4x",
  "face_enhancement": false,
  "subject_detection": "Foreground",
  "face_enhancement_strength": 0.8,
  "face_enhancement_creativity": 0.3
}
```

#### Output

```json
"https://replicate.delivery/xezq/XgpfHZYx07VnCyiwOGfh8KcFZD1Q5iIfeDbAUxv2iHOeRvykC/tmpcjqoazdg.jpg"
```


### Example (https://replicate.com/p/qqgfgar6k5rmc0cpdpdtcjfkdr)

#### Input

```json
{
  "image": "https://replicate.delivery/pbxt/Mto2sT3qwNZBRT3YMsI1TxiE3LWx0lECZYvV1TsjRDIZNFHN/0_2.jpg",
  "enhance_model": "CGI",
  "output_format": "jpg",
  "upscale_factor": "4x",
  "face_enhancement": false,
  "subject_detection": "Foreground",
  "face_enhancement_strength": 0.8,
  "face_enhancement_creativity": 0.3
}
```

#### Output

```json
"https://replicate.delivery/xezq/7VVfjaxuIxQJXSPPjsKq2r8vKFew5YZMsevaNRJ1Jzt32rMpA/tmpg5dqe4si.jpg"
```


## Model readme

> Professional-grade image upscaling powered by AI, from Topaz Labs.
> 
> This model is priced per unit which vary dependent on output image megapixels:
> 
> | Output MP | Units | Cost  |
> |-----------|-------|-------|
> | 12        | 1     | $0.05 |
> | 24        | 1     | $0.05 |
> | 36        | 2     | $0.10 |
> | 48        | 2     | $0.10 |
> | 60        | 3     | $0.15 |
> | 96        | 4     | $0.20 |
> | 132       | 5     | $0.24 |
> | 168       | 6     | $0.29 |
> | 336       | 11    | $0.53 |
> | 512       | 17    | $0.82 |
> 
> Select among the following enhancement models:
> 
> Standard V2 (general purpose)
> Low Resolution V2 (for low-res images)
> CGI (for digital art)
> High Fidelity V2 (preserves details)
> Text Refine (optimized for text)
> 
> Scale your image up to 6x.
> 
> Additionally, adjust facial enhancement parameters if your photo includes a face. This works especially well for blurry images.

