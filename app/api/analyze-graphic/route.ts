import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { fal } from "@fal-ai/client";
import { FAL_HAIRSTYLE_MODEL, HAIR_ANALYSIS_GRAPHIC_PROMPT } from "@/lib/salon-style-catalog";

export const runtime = "nodejs";

interface AnalyzeGraphicRequest {
  image?: string;
  forceRefresh?: boolean;
}

interface FalImage {
  url?: string;
}

interface FalEditResponse {
  data?: {
    images?: FalImage[];
    image?: FalImage;
  };
  images?: FalImage[];
  image?: FalImage;
  url?: string;
}

interface GraphicCacheEntry {
  image: string;
  model: string;
  expiresAt: number;
}

const GRAPHIC_CACHE_TTL_MS = 1000 * 60 * 60;

const globalForAnalyzeGraphic = globalThis as typeof globalThis & {
  __analyzeGraphicCache?: Map<string, GraphicCacheEntry>;
};

const analyzeGraphicCache = globalForAnalyzeGraphic.__analyzeGraphicCache ?? new Map<string, GraphicCacheEntry>();
globalForAnalyzeGraphic.__analyzeGraphicCache = analyzeGraphicCache;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function extractImageUrl(result: FalEditResponse) {
  return (
    result.data?.images?.[0]?.url ||
    result.images?.[0]?.url ||
    result.data?.image?.url ||
    result.image?.url ||
    result.url ||
    null
  );
}

function cleanupGraphicCache() {
  const now = Date.now();

  for (const [key, entry] of analyzeGraphicCache.entries()) {
    if (entry.expiresAt <= now) {
      analyzeGraphicCache.delete(key);
    }
  }
}

function createGraphicCacheKey(image: string) {
  return createHash("sha256").update(image).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { image, forceRefresh } = (await request.json()) as AnalyzeGraphicRequest;

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    cleanupGraphicCache();
    const cacheKey = createGraphicCacheKey(image);
    if (forceRefresh) {
      analyzeGraphicCache.delete(cacheKey);
    }

    const cached = analyzeGraphicCache.get(cacheKey);

    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        model: cached.model,
        image: cached.image,
        cached: true,
      });
    }

    const result = await fal.subscribe(FAL_HAIRSTYLE_MODEL, {
      input: {
        prompt: HAIR_ANALYSIS_GRAPHIC_PROMPT,
        image_urls: [image, image],
        image_size: "auto",
        quality: "medium",
        output_format: "png",
        num_images: 1,
      },
      logs: false,
      pollInterval: 500,
    });

    const imageUrl = extractImageUrl(result as FalEditResponse);

    if (!imageUrl) {
      throw new Error("AI did not return an analysis image");
    }

    analyzeGraphicCache.set(cacheKey, {
      image: imageUrl,
      model: FAL_HAIRSTYLE_MODEL,
      expiresAt: Date.now() + GRAPHIC_CACHE_TTL_MS,
    });

    return NextResponse.json({
      model: FAL_HAIRSTYLE_MODEL,
      image: imageUrl,
      cached: false,
    });
  } catch (error: unknown) {
    console.error("Analyze graphic API Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to generate analysis graphic" },
      { status: 500 }
    );
  }
}