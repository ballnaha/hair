import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { FAL_HAIRSTYLE_MODEL } from "@/lib/salon-style-catalog";

export const runtime = "nodejs";

interface FalHairImage {
  url?: string;
}

interface FalHairResponse {
  data?: {
    images?: FalHairImage[];
    image?: FalHairImage;
  };
  images?: FalHairImage[];
  image?: FalHairImage;
  url?: string;
}

type HairColor =
  | "black"
  | "dark_brown"
  | "light_brown"
  | "blonde"
  | "platinum_blonde"
  | "red"
  | "auburn"
  | "gray"
  | "silver"
  | "blue"
  | "green"
  | "purple"
  | "pink"
  | "rainbow"
  | "natural"
  | "highlights"
  | "ombre"
  | "balayage";

interface HairEditInput {
  prompt: string;
  image_urls: [string, string];
  image_size: "auto";
  quality: "medium";
  output_format: "png";
  num_images: 1;
}

interface HairCacheEntry {
  imageUrl: string;
  expiresAt: number;
}

const HAIR_CACHE_TTL_MS = 1000 * 60 * 60;
const FAL_POLL_INTERVAL_MS = 300;

const globalForHairRoute = globalThis as typeof globalThis & {
  __hairColorCache?: Map<string, HairCacheEntry>;
};

const hairColorCache = globalForHairRoute.__hairColorCache ?? new Map<string, HairCacheEntry>();
globalForHairRoute.__hairColorCache = hairColorCache;

const HAIR_COLOR_MAP: Record<string, HairColor> = {
  black: "black",
  darkbrown: "dark_brown",
  "dark brown": "dark_brown",
  lightbrown: "light_brown",
  "light brown": "light_brown",
  blonde: "blonde",
  platinumblonde: "platinum_blonde",
  "platinum blonde": "platinum_blonde",
  red: "red",
  auburn: "auburn",
  gray: "gray",
  grey: "gray",
  silver: "silver",
  blue: "blue",
  green: "green",
  purple: "purple",
  pink: "pink",
  rainbow: "rainbow",
  natural: "natural",
  highlights: "highlights",
  ombre: "ombre",
  balayage: "balayage",
  ashbrown: "light_brown",
  "ash brown": "light_brown",
  milkbrown: "light_brown",
  "milk brown": "light_brown",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function normalizeHairColor(color: unknown) {
  if (typeof color !== "string") {
    return "natural";
  }

  const normalized = color.trim().toLowerCase();
  return HAIR_COLOR_MAP[normalized] || "natural";
}

function formatHairColor(color: HairColor) {
  return color.replaceAll("_", " ");
}

function cleanupHairColorCache() {
  const now = Date.now();
  for (const [key, entry] of hairColorCache.entries()) {
    if (entry.expiresAt <= now) {
      hairColorCache.delete(key);
    }
  }
}

function createHairColorCacheKey(image: string, color: HairColor) {
  return createHash("sha256").update(image).update("\0").update(color).digest("hex");
}

function buildColorOnlyPrompt(color: HairColor) {
  return [
    `Change only the HAIR COLOR to ${formatHairColor(color)}.`,
    "Keep the exact same hairstyle, haircut shape, length, hairline, bangs, layers, and parting.",
    "Keep all facial geometry unchanged: eyes, eyebrows, nose, lips, jawline, ears, and skin texture.",
    "Keep beard, mustache, sideburns, and facial hair unchanged.",
    "Keep the exact same pose, camera angle, framing, background, clothing, and lighting.",
    "Preserve exact crop and zoom level.",
    "Apply color naturally to existing hair strands only; do not repaint skin or background.",
    "Output must look like the same person and the same hairstyle with color-only change.",
    "Identity consistency is critical: preserve the original face as closely as possible.",
  ].join(" ");
}

export async function POST(request: Request) {
  try {
    const { image, color } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    const hairColor = normalizeHairColor(color);
    cleanupHairColorCache();
    const cacheKey = createHairColorCacheKey(image, hairColor);
    const cached = hairColorCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ result: cached.imageUrl, cached: true });
    }

    const input: HairEditInput = {
      prompt: buildColorOnlyPrompt(hairColor),
      image_urls: [image, image],
      image_size: "auto",
      quality: "medium",
      output_format: "png",
      num_images: 1,
    };

    // Use the same edit model as hairstyle generation, but constrain prompt to color-only edits.
    const result = await fal.subscribe(FAL_HAIRSTYLE_MODEL, {
      input,
      logs: false,
      pollInterval: FAL_POLL_INTERVAL_MS,
    });

    const response = result as FalHairResponse;

    // Extract the image URL from the response
    const imageUrl = response.data?.images?.[0]?.url
      || response.images?.[0]?.url
      || response.data?.image?.url
      || response.image?.url
      || response.url;

    if (!imageUrl) {
      throw new Error("Unexpected fal.ai response format or missing image URL.");
    }

    hairColorCache.set(cacheKey, {
      imageUrl,
      expiresAt: Date.now() + HAIR_CACHE_TTL_MS,
    });

    return NextResponse.json({ result: imageUrl, cached: false });
  } catch (error: unknown) {
    console.error("Fal.ai API Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to transform image" },
      { status: 500 }
    );
  }
}
