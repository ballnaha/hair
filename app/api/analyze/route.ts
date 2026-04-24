import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

interface StyleSuggestion {
  name: string;
  image: string;
}

interface ColorSuggestion {
  name: string;
  hex: string;
  tone: string;
}

interface SuitabilityScore {
  label: string;
  value: number;
}

interface AnalysisResponse {
  faceShape: string;
  hairTexture: string;
  density: string;
  vibe: string;
  bestStyles: StyleSuggestion[];
  notRecommended: StyleSuggestion[];
  recommendedColors: ColorSuggestion[];
  suitability: SuitabilityScore[];
}

const DEFAULT_BEST_STYLE_IMAGES = [
  "https://images.unsplash.com/photo-1517832606299-7ae9b620a186?w=400&q=80",
  "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80",
  "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=400&q=80",
];

const DEFAULT_NOT_RECOMMENDED_IMAGES = [
  "https://images.unsplash.com/photo-1622281561081-423f73da6a7e?w=400&q=80",
  "https://images.unsplash.com/photo-1599839619722-39751411ea63?w=400&q=80",
];

const DEFAULT_ANALYSIS: AnalysisResponse = {
  faceShape: "Oval",
  hairTexture: "Straight",
  density: "Medium",
  vibe: "Smart",
  bestStyles: [
    { name: "Side Part", image: DEFAULT_BEST_STYLE_IMAGES[0] },
    { name: "Textured Crop", image: DEFAULT_BEST_STYLE_IMAGES[1] },
    { name: "Soft Quiff", image: DEFAULT_BEST_STYLE_IMAGES[2] },
  ],
  notRecommended: [
    { name: "Heavy Fringe", image: DEFAULT_NOT_RECOMMENDED_IMAGES[0] },
    { name: "Flat Top", image: DEFAULT_NOT_RECOMMENDED_IMAGES[1] },
  ],
  recommendedColors: [
    { name: "Natural Brown", hex: "#4a3728", tone: "Warm" },
    { name: "Ash Brown", hex: "#7a6a5d", tone: "Neutral" },
    { name: "Soft Beige", hex: "#9b7e6b", tone: "Soft" },
  ],
  suitability: [
    { label: "Recommended Length", value: 85 },
    { label: "Face Compatibility", value: 92 },
    { label: "Current Trend", value: 78 },
  ],
};

const ALLOWED_TONES = new Set(["Warm", "Cool", "Neutral", "Soft"]);

function sanitizeShortEnglish(value: unknown, fallback: string, maxWords = 4) {
  if (typeof value !== "string") {
    return fallback;
  }

  const ascii = value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[^A-Za-z0-9&/\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!ascii) {
    return fallback;
  }

  const words = ascii.split(" ").slice(0, maxWords);
  return words.join(" ");
}

function sanitizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : fallback;
}

function sanitizeTone(value: unknown, fallback: string) {
  const normalized = sanitizeShortEnglish(value, fallback, 1);
  const title = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  return ALLOWED_TONES.has(title) ? title : fallback;
}

function clampScore(value: unknown, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseJsonObject(text: string) {
  const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
  const parsed: unknown = JSON.parse(cleanJson);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI output is not a JSON object");
  }

  return parsed as Record<string, unknown>;
}

function toStyleArray(value: unknown, fallback: StyleSuggestion[], images: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return images.map((image, index) => {
    const source = value[index];
    const sourceName =
      source && typeof source === "object" && !Array.isArray(source)
        ? (source as Record<string, unknown>).name
        : undefined;

    return {
      name: sanitizeShortEnglish(sourceName, fallback[index]?.name ?? "Style", 3),
      image,
    };
  });
}

function toColors(value: unknown, fallback: ColorSuggestion[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return fallback.map((item, index) => {
    const source = value[index];
    const sourceObj = source && typeof source === "object" && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : undefined;

    return {
      name: sanitizeShortEnglish(sourceObj?.name, item.name, 3),
      hex: sanitizeHexColor(sourceObj?.hex, item.hex),
      tone: sanitizeTone(sourceObj?.tone, item.tone),
    };
  });
}

function toSuitability(value: unknown, fallback: SuitabilityScore[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return fallback.map((item, index) => {
    const source = value[index];
    const sourceObj = source && typeof source === "object" && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : undefined;

    return {
      label: sanitizeShortEnglish(sourceObj?.label, item.label, 3),
      value: clampScore(sourceObj?.value, item.value),
    };
  });
}

function extractOutputText(result: unknown) {
  if (!result || typeof result !== "object") {
    return "";
  }

  const record = result as Record<string, unknown>;
  if (typeof record.output === "string") {
    return record.output;
  }

  const data = record.data;
  if (!data || typeof data !== "object") {
    return "";
  }

  const dataRecord = data as Record<string, unknown>;
  return typeof dataRecord.output === "string" ? dataRecord.output : "";
}

function normalizeAnalysis(raw: Record<string, unknown>): AnalysisResponse {
  return {
    faceShape: sanitizeShortEnglish(raw.faceShape, DEFAULT_ANALYSIS.faceShape, 3),
    hairTexture: sanitizeShortEnglish(raw.hairTexture, DEFAULT_ANALYSIS.hairTexture, 3),
    density: sanitizeShortEnglish(raw.density, DEFAULT_ANALYSIS.density, 3),
    vibe: sanitizeShortEnglish(raw.vibe, DEFAULT_ANALYSIS.vibe, 3),
    bestStyles: toStyleArray(raw.bestStyles, DEFAULT_ANALYSIS.bestStyles, DEFAULT_BEST_STYLE_IMAGES),
    notRecommended: toStyleArray(
      raw.notRecommended,
      DEFAULT_ANALYSIS.notRecommended,
      DEFAULT_NOT_RECOMMENDED_IMAGES
    ),
    recommendedColors: toColors(raw.recommendedColors, DEFAULT_ANALYSIS.recommendedColors),
    suitability: toSuitability(raw.suitability, DEFAULT_ANALYSIS.suitability),
  };
}

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const prompt = `You are a professional hair and face analysis expert.
Analyze only the visible person in this image.

Hard requirements:
- Return one valid JSON object only.
- No markdown, no preamble, no code fences.
- English only.
- Keep short text fields to 1-3 words.
- Use values that are realistic for this person.

Return exactly this schema (same keys, same nesting):
{
  "faceShape": "Short text",
  "hairTexture": "Short text",
  "density": "Short text",
  "vibe": "Short text",
  "bestStyles": [
    {"name": "Short style name", "image": "https://images.unsplash.com/photo-1517832606299-7ae9b620a186?w=400&q=80"},
    {"name": "Short style name", "image": "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80"},
    {"name": "Short style name", "image": "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=400&q=80"}
  ],
  "notRecommended": [
    {"name": "Short style name", "image": "https://images.unsplash.com/photo-1622281561081-423f73da6a7e?w=400&q=80"},
    {"name": "Short style name", "image": "https://images.unsplash.com/photo-1599839619722-39751411ea63?w=400&q=80"}
  ],
  "recommendedColors": [
    {"name": "Short color name", "hex": "#4a3728", "tone": "Warm"},
    {"name": "Short color name", "hex": "#7a6a5d", "tone": "Neutral"},
    {"name": "Short color name", "hex": "#9b7e6b", "tone": "Soft"}
  ],
  "suitability": [
    {"label": "Recommended Length", "value": 0},
    {"label": "Face Compatibility", "value": 0},
    {"label": "Current Trend", "value": 0}
  ]
}`;

    const result: unknown = await fal.subscribe("fal-ai/llava-next", {
      input: {
        prompt,
        image_url: image,
        max_tokens: 2048,
      },
      pollInterval: 500,
    });

    console.log("Analysis raw result:", JSON.stringify(result, null, 2));

    let analysis: AnalysisResponse;
    try {
      const outputText = extractOutputText(result);
      if (!outputText) {
        throw new Error("AI returned an empty output.");
      }

      const raw = parseJsonObject(outputText);
      analysis = normalizeAnalysis(raw);
    } catch (error: unknown) {
      console.error("Failed to parse AI JSON:", error);
      throw new Error("AI returned invalid data format. Raw: " + JSON.stringify(result).substring(0, 500));
    }

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("Analysis API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze image";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
