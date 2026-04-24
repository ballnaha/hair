export type SalonStyleGender = "male" | "female";

export interface SalonStyle {
  id: string;
  name: string;
  label: string;
  gender: SalonStyleGender;
  previewImage: string;
  referenceImage: string;
  prompt: string;
}

export const FAL_HAIRSTYLE_MODEL = "openai/gpt-image-2/edit";

export const HAIR_ANALYSIS_GRAPHIC_PROMPT = `Create a hair analysis infographic from this portrait.

Language rules:
- English only.
- Do not use Thai or any non-English text.
- Use very short labels (1-3 words), no paragraphs.
- Use English alphabet, numbers, and basic punctuation only.

Layout rules (strict, match this blueprint):
- Vertical 3:4 canvas, clean light-gray background with dark panel headers.
- Keep one SINGLE composite infographic image (not multiple pages).
- Top row split into 2 columns:
  1) Left: large original portrait.
  2) Right: "HAIR & FACE ANALYSIS" metrics grid with exactly 5 columns:
     Face Shape, Hair Texture, Hair Density, Hairline & Forehead, Overall Vibe.
- Second row split into 2 panels:
  1) "BEST HAIRSTYLES" with exactly 5 mini portrait cards and a small green check marker (✓) on the panel header and each card.
  2) "NOT RECOMMENDED" with exactly 3 mini portrait cards and a small red X marker (✕) on the panel header and each card.
- Third row split into 2 panels:
  1) "HAIR LENGTH" with exactly 3 cards: Short, Medium, Long.
  2) "PARTING & FRINGE" with exactly 5 cards.
- Fourth row is one wide panel: "HAIR COLOR" with two internal zones:
  1) Left zone "TONE ANALYSIS" with Warm / Neutral / Cool swatches.
  2) Right zone "COLOR EXAMPLES" with exactly 6 mini portrait color cards.
- Fifth row split into 2 panels:
  1) Left: "OVERALL LOOK" with 4 icon-style traits.
  2) Right: "YOU SUIT" with 3 short bullet recommendations and one small portrait.
- Keep all cards aligned to a precise grid with thin dividers and equal padding.
- Keep panel headers uppercase and visually consistent.
- Marker style: small and subtle only, around 10-12px visual size, thin stroke, low visual weight.
- Marker placement: top-left corner of each card with 6-8px padding; do not overlap the face area.
- Keep panel labels to 1-3 words.
- Keep recommendation bullets in YOU SUIT to max 5 words per line.

Content rules:
- Keep the exact same person identity and portrait across all panels.
- Keep facial geometry unchanged in every panel: eyes, eyebrows, nose, lips, jawline, ears, and skin texture.
- Keep the same head pose, camera angle, framing, and perspective in every panel.
- Do not stylize or cartoonize the face; keep a photoreal look close to the source photo.
- Show side-by-side mini visual examples where relevant.
- In Hair Color section, change color on the same hairstyle only; do not change hairstyle shape.
- Original image usage rule: only the top-left main portrait may be the unedited source image.
- Do NOT reuse the exact unedited source portrait in BEST HAIRSTYLES, NOT RECOMMENDED, HAIR LENGTH, PARTING & FRINGE, or COLOR EXAMPLES cards.
- Every mini card must show a visibly different hair result (shape, length, parting/fringe, or color) relative to the source image.
- Keep typography clean sans-serif and readable; avoid decorative fonts.
- Keep labels concise and aligned consistently in each panel.
- Use clean, modern styling and high readability.
- Avoid decorative long text and avoid handwritten or stylized fonts.`;

export const SALON_STYLE_CATALOG: SalonStyle[] = [
  {
    id: "m-classic-side-part",
    name: "Classic Side Part",
    label: "แสกข้างคลาสสิก",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1200&q=80&fit=crop",
    prompt: "Create a clean classic side part with controlled volume and a polished salon finish.",
  },
  {
    id: "m-korean-middle-part",
    name: "Korean Middle Part",
    label: "แสกกลางเกาหลี",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&q=80&fit=crop",
    prompt: "Create a soft Korean middle part with natural curtain flow and balanced volume around the forehead.",
  },
  {
    id: "m-textured-crop",
    name: "Textured Crop",
    label: "เท็กซ์เจอร์ครอป",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&q=80&fit=crop",
    prompt: "Create a modern textured crop with short sides, lifted texture on top, and a sharp silhouette.",
  },
  {
    id: "m-soft-quiff",
    name: "Soft Quiff",
    label: "ควิฟนุ่ม",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80&fit=crop",
    prompt: "Create a soft quiff with front lift, gentle texture, and a tidy barbershop finish.",
  },
  {
    id: "m-taper-fade-comb",
    name: "Taper Fade Comb",
    label: "หวีเสยเฟด",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=1200&q=80&fit=crop",
    prompt: "Create a taper fade with a combed top, crisp sides, and a refined salon look.",
  },
  {
    id: "m-wavy-volume",
    name: "Wavy Volume",
    label: "ลอนวอลุ่ม",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=1200&q=80&fit=crop",
    prompt: "Create medium wavy volume with natural movement and airy texture.",
  },
  {
    id: "m-french-crop",
    name: "French Crop",
    label: "เฟรนช์ครอป",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=1200&q=80&fit=crop",
    prompt: "Create a French crop with a short textured fringe and structured compact shape.",
  },
  {
    id: "m-slick-back",
    name: "Slick Back",
    label: "เสยหลังเนี้ยบ",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=1200&q=80&fit=crop",
    prompt: "Create a slicked-back hairstyle with smooth direction, controlled shine, and clean side structure.",
  },
  {
    id: "m-short-mullet",
    name: "Short Mullet",
    label: "มัลเล็ตสั้น",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1522556189639-b150d8a2d7c2?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1522556189639-b150d8a2d7c2?w=1200&q=80&fit=crop",
    prompt: "Create a soft short mullet with extra length at the back and a fashion-forward layered outline.",
  },
  {
    id: "m-buzz-clean",
    name: "Clean Buzz",
    label: "บัซคัตสะอาด",
    gender: "male",
    previewImage: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=1200&q=80&fit=crop",
    prompt: "Create a clean buzz cut with even length and sharp contours.",
  },
  {
    id: "f-long-soft-layer",
    name: "Long Soft Layer",
    label: "เลเยอร์ยาวนุ่ม",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80&fit=crop",
    prompt: "Create a clean classic side part with controlled volume and a polished salon finish.",
  },
  {
    id: "f-korean-c-curl",
    name: "Korean C Curl",
    label: "ซีเคิร์ลเกาหลี",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&q=80&fit=crop",
    prompt: "Create a Korean C-curl style with glossy ends, soft body, and a neat luxurious finish.",
  },
  {
    id: "f-airy-bangs-long",
    name: "Airy Bangs Long",
    label: "หน้าม้าซีทรูยาว",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&q=80&fit=crop",
    prompt: "Create long hair with airy see-through bangs and a soft feminine silhouette.",
  },
  {
    id: "f-classic-bob",
    name: "Classic Bob",
    label: "บ็อบคลาสสิก",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=80&fit=crop",
    prompt: "Create a classic bob with a smooth perimeter and elegant shape around the jawline.",
  },
  {
    id: "f-french-bob",
    name: "French Bob",
    label: "เฟรนช์บ็อบ",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&q=80&fit=crop",
    prompt: "Create a French bob with subtle volume, chic shape, and lightweight bangs.",
  },
  {
    id: "f-medium-wave-layer",
    name: "Medium Wave Layer",
    label: "ลอนกลางมีเลเยอร์",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&q=80&fit=crop",
    prompt: "Create medium layered waves with airy volume and natural salon texture.",
  },
  {
    id: "f-hush-cut",
    name: "Hush Cut",
    label: "ฮัชคัต",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=1200&q=80&fit=crop",
    prompt: "Create a hush cut with layered softness, feathered ends, and airy Korean styling.",
  },
  {
    id: "f-pixie-volume",
    name: "Pixie Volume",
    label: "พิกซี่มีวอลุ่ม",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&q=80&fit=crop",
    prompt: "Create a volumized pixie cut with soft crown lift and a polished editorial finish.",
  },
  {
    id: "f-high-pony-glam",
    name: "High Pony Glam",
    label: "หางม้าสูงแกลม",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1200&q=80&fit=crop",
    prompt: "Create a sleek high ponytail with lifted crown tension and a glamorous finish.",
  },
  {
    id: "f-long-hollywood-wave",
    name: "Hollywood Wave",
    label: "ลอนฮอลลีวูดยาว",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1200&q=80&fit=crop",
    prompt: "Create long Hollywood waves with glossy definition and red-carpet polish.",
  },
  {
    id: "f-short-wolf-cut",
    name: "Short Wolf Cut",
    label: "วูล์ฟคัตสั้น",
    gender: "female",
    previewImage: "https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=800&q=80&fit=crop",
    referenceImage: "https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=1200&q=80&fit=crop",
    prompt: "Create a short wolf cut with edgy layers, airy crown texture, and modern movement.",
  },
];

export function getSalonCatalogByGender(gender: SalonStyleGender) {
  return SALON_STYLE_CATALOG.filter((style) => style.gender === gender);
}

export function getSalonStyleById(styleId: string) {
  return SALON_STYLE_CATALOG.find((style) => style.id === styleId) ?? null;
}
