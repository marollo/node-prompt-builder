/**
 * Central data file for all dropdown options used across node types.
 * Edit the lists here to add, remove, or rename any dropdown item.
 * Each node imports only the options it needs from this file.
 */

// ─── Subject Node ─────────────────────────────────────────────────────────────

export const SUBJECT_COUNT = [
  'Single',
  'Two',
  'Group',
  'Crowd',
]

export const SUBJECT_POSITION = [
  'Center',
  'Rule of Thirds Left',
  'Rule of Thirds Right',
  'Foreground',
  'Background',
  'Full Frame',
]

// ─── Location / Set Node ──────────────────────────────────────────────────────

export const LOCATION_SETTING_TYPE = [
  'Interior',
  'Exterior',
  'Natural Landscape',
  'Urban',
  'Studio',
  'Abstract / Void',
  'Underwater',
  'Space',
]

export const LOCATION_ATMOSPHERE = [
  'Clear',
  'Foggy',
  'Rainy',
  'Snowy',
  'Stormy',
  'Dusty',
  'Smoky',
  'None',
]

// ─── Camera Preset Node ───────────────────────────────────────────────────────

export const CAMERA_ANGLE = [
  'Eye Level',
  'Low Angle',
  'High Angle',
  "Bird's Eye",
  "Worm's Eye",
  'Dutch Angle',
  'Over the Shoulder',
  'Over-the-shoulder POV',
  'GoPro POV',
  'Leica M11',
  'Kodak Portra 400',
  'Arri Alexa',
]

export const CAMERA_FOCAL_LENGTH = [
  'Wide Angle',
  '35mm',
  '50mm',
  '85mm Portrait',
  'Telephoto',
  'Macro Lens',
  'Anamorphic Lens',
  'Deep Depth of Field',
  '80s Soft Focus',

]

// ─── Lighting Preset Node ─────────────────────────────────────────────────────

export const LIGHTING_STYLE = [
  'Natural Daylight',
  'Golden Hour',
  'Overcast',
  'Rembrandt',
  'Softbox',
  'Hard Side Light',
  'Rim Light',
  'Neon Backlight',
  'Candlelight',
  'Studio White',
  'Butterfly Lighting',
  'Split Lighting',
  'Loop Lighting',
  'Speedlights',
  'Long Exposure',
  'Hard Lighting',
]

export const LIGHTING_TIME_OF_DAY = [
  'Dawn',
  'Morning',
  'Midday',
  'Afternoon',
  'Dusk',
  'Night',
  'Not Applicable',
]

// ─── Style / Mood Node ────────────────────────────────────────────────────────

export const STYLE_VISUAL = [
  'Photorealistic',
  'Cinematic',
  'Analog Film',
  'Illustration',
  'Oil Painting',
  'Watercolor',
  'Comic Book',
  'Concept Art',
  'Dark Fantasy',
  'Minimalist',
]

export const STYLE_MOOD = [
  'Dramatic',
  'Peaceful',
  'Tense',
  'Melancholic',
  'Euphoric',
  'Mysterious',
  'Gritty',
  'Dreamy',
]

// ─── Output Node — fal.ai generation parameters ───────────────────────────────

// Full aspect ratio list from the Nano Banana 2 API docs
export const FALAI_ASPECT_RATIO = [
  'auto',
  '1:1',
  '16:9', '9:16',
  '3:2',  '2:3',
  '4:3',  '3:4',
  '5:4',  '4:5',
  '21:9',
  '4:1',  '1:4',
  '8:1',  '1:8',
]

export const FALAI_NUM_IMAGES = ['1', '2', '3', '4']

export const FALAI_OUTPUT_FORMAT = ['png', 'jpeg', 'webp']

// Safety tolerance: 1 = strictest, 6 = most permissive. API default is "4"
export const FALAI_SAFETY = ['1', '2', '3', '4', '5', '6']

// Resolution affects both quality and price — 1K is the standard rate ($0.08/image)
export const FALAI_RESOLUTION = ['0.5K', '1K', '2K', '4K']

// API format selector — controls which formatter apiClient uses
export const API_FORMAT = ['Generic REST', 'fal.ai']

// ─── Recraft V4 Pro Node ──────────────────────────────────────────────────────

// Named image sizes from the Recraft V4 Pro API docs
export const RECRAFT_IMAGE_SIZE = [
  'square_hd',
  'square',
  'portrait_4_3',
  'portrait_16_9',
  'landscape_4_3',
  'landscape_16_9',
]

// Safety checker toggle — maps to the enable_safety_checker boolean in the API
export const RECRAFT_SAFETY = ['on', 'off']

