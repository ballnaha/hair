import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { FAL_HAIRSTYLE_MODEL, getSalonStyleById } from "@/lib/salon-style-catalog";
import { MAX_HAIRSTYLE_PREVIEW_COUNT } from "@/lib/tryOnConfig";

export const runtime = "nodejs";

interface BatchHairRequest {
  image?: string;
  selectedStyleIds?: string[];
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

interface FalEditInput {
  prompt: string;
  image_urls: [string, string];
  image_size: "auto";
  quality: "medium";
  output_format: "png";
  num_images: 1;
}

interface GeneratedStyle {
  id: string;
  name: string;
  label: string;
  referenceImage: string;
  previewImage: string;
  image: string | null;
}

type BatchHairJobStatus = "processing" | "completed" | "failed";

interface BatchHairJob {
  id: string;
  cacheKey: string;
  status: BatchHairJobStatus;
  model?: string;
  selected: GeneratedStyle[];
  completedCount: number;
  totalCount: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

const BATCH_JOB_TTL_MS = 1000 * 60 * 60;
const FAL_POLL_INTERVAL_MS = 300;
const MAX_PARALLEL_STYLE_JOBS = 2;

const globalForBatchHair = globalThis as typeof globalThis & {
  __batchHairJobs?: Map<string, BatchHairJob>;
  __batchHairJobKeys?: Map<string, string>;
};

const batchHairJobs = globalForBatchHair.__batchHairJobs ?? new Map<string, BatchHairJob>();
const batchHairJobKeys = globalForBatchHair.__batchHairJobKeys ?? new Map<string, string>();

globalForBatchHair.__batchHairJobs = batchHairJobs;
globalForBatchHair.__batchHairJobKeys = batchHairJobKeys;

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

function buildEditPrompt(styleName: string, stylePrompt: string) {
  return [
    `Edit only the customer's hairstyle to match the salon reference for \"${styleName}\".`,
    stylePrompt,
    "Preserve the exact same person identity and facial geometry.",
    "Keep eyes, eyebrows, nose, lips, jawline, ears, and skin texture unchanged.",
    "Keep beard, mustache, sideburns, and facial hair boundaries unchanged.",
    "Keep the exact same camera angle, head pose, framing, and perspective.",
    "Preserve exact crop and zoom level.",
    "Keep skin tone, expression, background, clothing, and lighting unchanged.",
    "Only modify hair shape according to the requested style; do not alter facial proportions.",
    "Keep the result realistic and suitable for a hairstyle consultation preview.",
    "Do not change facial features, age, accessories, or camera angle unless needed for realism.",
    "Identity consistency is critical: output must look like the original person at first glance.",
  ].join(" ");
}

function createGeneratedStyle(style: NonNullable<ReturnType<typeof getSalonStyleById>>, image: string | null): GeneratedStyle {
  return {
    id: style.id,
    name: style.name,
    label: style.label,
    referenceImage: style.referenceImage,
    previewImage: style.previewImage,
    image,
  };
}

function cleanupExpiredJobs() {
  const now = Date.now();

  for (const [jobId, job] of batchHairJobs.entries()) {
    if (job.expiresAt > now) {
      continue;
    }

    batchHairJobs.delete(jobId);

    if (batchHairJobKeys.get(job.cacheKey) === jobId) {
      batchHairJobKeys.delete(job.cacheKey);
    }
  }
}

function createRequestCacheKey(image: string, selectedStyleIds: string[]) {
  return createHash("sha256")
    .update(image)
    .update("\0")
    .update(selectedStyleIds.join("|"))
    .digest("hex");
}

function createJobResponse(job: BatchHairJob, cached = false) {
  return {
    jobId: job.id,
    status: job.status,
    model: job.model,
    selected: job.status === "completed" ? job.selected : undefined,
    completedCount: job.completedCount,
    totalCount: job.totalCount,
    error: job.error,
    cached,
  };
}

async function runBatchHairJob(
  jobId: string,
  image: string,
  selectedStyles: NonNullable<ReturnType<typeof getSalonStyleById>>[]
) {
  const job = batchHairJobs.get(jobId);

  if (!job) {
    return;
  }

  const results: Array<GeneratedStyle | undefined> = new Array(selectedStyles.length);

  try {
    let nextIndex = 0;

    const runOne = async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;

        if (index >= selectedStyles.length) {
          return;
        }

        const style = selectedStyles[index];

        try {
          const input: FalEditInput = {
            prompt: buildEditPrompt(style.name, style.prompt),
            image_urls: [image, style.referenceImage],
            image_size: "auto",
            quality: "medium",
            output_format: "png",
            num_images: 1,
          };

          const result = await fal.subscribe(FAL_HAIRSTYLE_MODEL, {
            input,
            logs: false,
            pollInterval: FAL_POLL_INTERVAL_MS,
          });

          const imageUrl = extractImageUrl(result as FalEditResponse);
          results[index] = createGeneratedStyle(style, imageUrl || null);
        } catch (error: unknown) {
          console.error(`Failed: ${style.name}:`, getErrorMessage(error));
          results[index] = createGeneratedStyle(style, null);
        }

        const completed = results.filter((item): item is GeneratedStyle => item !== undefined);
        job.selected = completed;
        job.completedCount = completed.length;
        job.updatedAt = Date.now();
        job.expiresAt = job.updatedAt + BATCH_JOB_TTL_MS;
      }
    };

    const workers = Array.from({ length: Math.min(MAX_PARALLEL_STYLE_JOBS, selectedStyles.length) }, () => runOne());
    await Promise.all(workers);

    job.status = "completed";
    job.model = FAL_HAIRSTYLE_MODEL;
    job.selected = results.filter((item): item is GeneratedStyle => item !== undefined);
    job.updatedAt = Date.now();
    job.expiresAt = job.updatedAt + BATCH_JOB_TTL_MS;
  } catch (error: unknown) {
    job.status = "failed";
    job.error = getErrorMessage(error);
    job.updatedAt = Date.now();
    job.expiresAt = job.updatedAt + BATCH_JOB_TTL_MS;
    console.error("Batch API Error:", error);
  }
}

export async function GET(request: Request) {
  cleanupExpiredJobs();

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = batchHairJobs.get(jobId);

  if (!job) {
    return NextResponse.json({ error: "Batch hairstyle job not found" }, { status: 404 });
  }

  const statusCode = job.status === "processing" ? 202 : job.status === "failed" ? 500 : 200;
  return NextResponse.json(createJobResponse(job), { status: statusCode });
}

export async function POST(request: Request) {
  try {
    cleanupExpiredJobs();

    const { image, selectedStyleIds } = (await request.json()) as BatchHairRequest;

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    if (!Array.isArray(selectedStyleIds) || selectedStyleIds.length === 0) {
      return NextResponse.json({ error: "At least one hairstyle must be selected" }, { status: 400 });
    }

    if (selectedStyleIds.length > MAX_HAIRSTYLE_PREVIEW_COUNT) {
      return NextResponse.json(
        { error: `You can select up to ${MAX_HAIRSTYLE_PREVIEW_COUNT} hairstyles` },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(selectedStyleIds as string[])];
    const selectedStyles = uniqueIds
      .map((styleId) => getSalonStyleById(styleId))
      .filter((style) => style !== null);

    if (selectedStyles.length !== uniqueIds.length) {
      return NextResponse.json({ error: "One or more selected hairstyles are invalid" }, { status: 400 });
    }

    const cacheKey = createRequestCacheKey(image, uniqueIds);
    const existingJobId = batchHairJobKeys.get(cacheKey);

    if (existingJobId) {
      const existingJob = batchHairJobs.get(existingJobId);

      if (existingJob) {
        const statusCode = existingJob.status === "processing" ? 202 : existingJob.status === "failed" ? 500 : 200;
        return NextResponse.json(createJobResponse(existingJob, true), { status: statusCode });
      }

      batchHairJobKeys.delete(cacheKey);
    }

    const now = Date.now();
    const job: BatchHairJob = {
      id: randomUUID(),
      cacheKey,
      status: "processing",
      selected: [],
      completedCount: 0,
      totalCount: selectedStyles.length,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + BATCH_JOB_TTL_MS,
    };

    batchHairJobs.set(job.id, job);
    batchHairJobKeys.set(cacheKey, job.id);

    console.log(`Starting salon hairstyle generation: ${selectedStyles.length} jobs...`);
    void runBatchHairJob(job.id, image, selectedStyles);

    return NextResponse.json(createJobResponse(job), { status: 202 });
  } catch (error: unknown) {
    console.error("Batch API Error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to generate hairstyles" },
      { status: 500 }
    );
  }
}
