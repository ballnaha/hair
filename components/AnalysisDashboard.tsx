"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MAX_HAIR_COLOR_PREVIEW_COUNT } from "@/lib/tryOnConfig";
import {
  Check,
  Download,
  Palette,
  RefreshCw,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface StyleResult {
  id: string;
  name: string;
  label: string;
  image: string | null;
  previewImage: string;
  referenceImage: string;
}

interface AnalysisData {
  recommendedColors: { name: string; hex: string; tone: string }[];
  generatedStyles?: {
    model?: string;
    selected: StyleResult[];
  };
}

const COLOR_PREVIEW_CACHE_VERSION = "v2-color-only";

function sanitizeFilenamePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "image";
}

async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to download image");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  } catch (error) {
    console.error("Image download fallback:", error);
  }

  const fallbackLink = document.createElement("a");
  fallbackLink.href = url;
  fallbackLink.target = "_blank";
  fallbackLink.rel = "noopener noreferrer";
  document.body.append(fallbackLink);
  fallbackLink.click();
  fallbackLink.remove();
}

function loadImageElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for export"));
    image.src = url;
  });
}

function drawExportLabel(
  context: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  labels: { style: string; color?: string; colorHex?: string }
) {
  const padX = Math.max(18, Math.round(canvasWidth * 0.035));
  const padY = Math.max(14, Math.round(canvasHeight * 0.02));
  const lineHeight = Math.max(20, Math.round(canvasHeight * 0.042));
  const textSize = Math.max(14, Math.round(canvasWidth * 0.028));
  const colorLabel = labels.color ?? "Original";
  const colorLine = labels.colorHex ? `Color: ${colorLabel} (${labels.colorHex})` : `Color: ${colorLabel}`;
  const lines = [`Style: ${labels.style}`, colorLine];
  const blockHeight = lineHeight * lines.length + padY * 1.6;

  const gradient = context.createLinearGradient(0, canvasHeight - blockHeight, 0, canvasHeight);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0.15)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.72)");

  context.fillStyle = gradient;
  context.fillRect(0, canvasHeight - blockHeight, canvasWidth, blockHeight);

  context.font = `700 ${textSize}px "Arial", sans-serif`;
  context.fillStyle = "#ffffff";
  context.textBaseline = "top";

  lines.forEach((line, index) => {
    context.fillText(line, padX, canvasHeight - blockHeight + padY + index * lineHeight);
  });

  if (labels.colorHex) {
    const swatchSize = Math.max(32, Math.round(textSize * 2.2));
    const swatchX = canvasWidth - padX - swatchSize;
    const swatchY = canvasHeight - blockHeight + padY + lineHeight + Math.max(1, Math.round((lineHeight - swatchSize) / 2));
    const swatchRadius = swatchSize / 2;
    const swatchCenterX = swatchX + swatchRadius;
    const swatchCenterY = swatchY + swatchRadius;

    context.fillStyle = labels.colorHex;
    context.beginPath();
    context.arc(swatchCenterX, swatchCenterY, swatchRadius, 0, Math.PI * 2);
    context.closePath();
    context.fill();

    context.strokeStyle = "rgba(255, 255, 255, 0.92)";
    context.lineWidth = Math.max(2, Math.round(canvasWidth * 0.004));
    context.beginPath();
    context.arc(
      swatchCenterX,
      swatchCenterY,
      Math.max(1, swatchRadius - context.lineWidth / 2),
      0,
      Math.PI * 2
    );
    context.closePath();
    context.stroke();
  }
}

async function downloadImageWithLabels(
  imageUrl: string,
  filename: string,
  labels: { style: string; color?: string; colorHex?: string }
) {
  try {
    const image = await loadImageElement(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to create export canvas");
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawExportLabel(context, canvas.width, canvas.height, labels);

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    return;
  } catch (error) {
    console.error("Labeled export fallback:", error);
  }

  await downloadImage(imageUrl, filename);
}

interface AnalysisDashboardProps {
  data: AnalysisData;
  userImage: string;
  onReset: () => void;
  generationTime?: number | null;
}

export function AnalysisDashboard({ data, userImage, onReset, generationTime }: AnalysisDashboardProps) {
  const [generated] = useState(data.generatedStyles);
  const [isGeneratingColors, setIsGeneratingColors] = useState(false);
  const [downloadingImageKey, setDownloadingImageKey] = useState<string | null>(null);
  const [colorPreviewCache, setColorPreviewCache] = useState<Record<string, string | null>>({});
  const [selectedColorNames, setSelectedColorNames] = useState<string[]>(() =>
    data.recommendedColors.slice(0, MAX_HAIR_COLOR_PREVIEW_COUNT).map((color) => color.name)
  );
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(generated?.selected.find((style) => style.image)?.id ?? generated?.selected[0]?.id ?? null);

  const selectedStyle = generated?.selected.find((style) => style.id === selectedStyleId) ?? generated?.selected[0] ?? null;
  const selectedStylePreview = selectedStyle?.image ?? null;

  const selectedStyleCachePrefix = selectedStyle?.id ?? "default";
  const selectedStyleCacheScope = `${COLOR_PREVIEW_CACHE_VERSION}:${selectedStyleCachePrefix}`;
  const colorPreviews = Object.fromEntries(
    data.recommendedColors.map((color) => [
      color.name,
      colorPreviewCache[`${selectedStyleCacheScope}:${color.name}`] ?? null,
    ])
  );
  const selectedColors = data.recommendedColors.filter((color) => selectedColorNames.includes(color.name));
  const hasGeneratedCurrentStyleColors =
    !!selectedStyle &&
    selectedColors.length > 0 &&
    selectedColors.every((color) => `${selectedStyleCacheScope}:${color.name}` in colorPreviewCache);
  const toggleColorSelection = (colorName: string) => {
    setSelectedColorNames((current) => {
      if (current.includes(colorName)) {
        return current.filter((name) => name !== colorName);
      }

      if (current.length >= MAX_HAIR_COLOR_PREVIEW_COUNT) {
        if (Number(MAX_HAIR_COLOR_PREVIEW_COUNT) === 1) {
          return [colorName];
        }

        toast.warning(`เลือกสีผมได้สูงสุด ${MAX_HAIR_COLOR_PREVIEW_COUNT} สี`, {
          id: "hair-color-max-limit",
        });
        return current;
      }

      return [...current, colorName];
    });
  };

  const handleDownloadImage = async (
    imageUrl: string | null,
    key: string,
    filename: string,
    labels: { style: string; color?: string; colorHex?: string }
  ) => {
    if (!imageUrl || downloadingImageKey) {
      return;
    }

    setDownloadingImageKey(key);

    try {
      await downloadImageWithLabels(imageUrl, filename, labels);
    } finally {
      setDownloadingImageKey(null);
    }
  };

  const handleGenerateColorPreviews = async () => {
    if (!selectedStyle || isGeneratingColors) {
      return;
    }

    if (selectedColors.length === 0) {
      alert("กรุณาเลือกสีผมอย่างน้อย 1 สี");
      return;
    }

    if (!selectedStyle.image) {
      alert("ทรงผมนี้ยังไม่มีภาพลูกค้าที่สร้างสำเร็จ กรุณาเลือกทรงอื่นหรือลองสร้างใหม่");
      return;
    }

    setIsGeneratingColors(true);

    try {
      const entries = await Promise.all(
        selectedColors.map(async (color) => {
          const cacheKey = `${COLOR_PREVIEW_CACHE_VERSION}:${selectedStyle.id}:${color.name}`;

          if (cacheKey in colorPreviewCache) {
            return [color.name, colorPreviewCache[cacheKey]] as const;
          }

          try {
            const response = await fetch("/api/hair", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: selectedStyle.image,
                styleId: selectedStyle.id,
                color: color.name,
              }),
            });

            const result = (await response.json()) as { error?: string; result?: string };

            if (!response.ok || result.error) {
              throw new Error(result.error || "Failed to generate color preview");
            }

            return [color.name, result.result ?? null] as const;
          } catch (error) {
            console.error(`Failed to generate preview for ${color.name}:`, error);
            return [color.name, null] as const;
          }
        })
      );

      const styleCacheEntries = Object.fromEntries(
        entries.map(([colorName, image]) => [
          `${COLOR_PREVIEW_CACHE_VERSION}:${selectedStyle.id}:${colorName}`,
          image,
        ])
      );

      setColorPreviewCache((current) => ({
        ...current,
        ...styleCacheEntries,
      }));
    } finally {
      setIsGeneratingColors(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 pt-6 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── Top Result Header ── */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">Result</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">AI Beauty Transformation</p>
        </div>
        <button
          onClick={onReset}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 text-secondary-foreground backdrop-blur-md transition-all hover:bg-secondary hover:scale-105 active:scale-95 shadow-sm border border-white/20"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>


      {/* ── Content Section ── */}
      <div className="space-y-8">

      {/* ── STEP 1: Choose a style ── */}
      {generated?.selected && generated.selected.length > 0 && (
        <section className="space-y-4 rounded-[30px] border border-border/60 bg-card/70 p-4 sm:p-5 dark:bg-card/45">
          {/* step label */}
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
            <div>
              <p className="text-base font-bold leading-tight">เลือกทรงผม</p>
              <p className="text-xs text-muted-foreground">แตะทรงที่ชอบเพื่อนำไปลองสีผมต่อ</p>
            </div>
          </div>

          {/* style cards row: original + generated */}
          <div className="grid grid-cols-2 gap-3">
            {/* Original */}
            <div className="flex flex-col gap-1.5">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-muted/30 ring-1 ring-muted/60">
                <Image src={userImage} alt="Original" fill className="object-cover" sizes="25vw" quality={95} />
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
                <p className="absolute bottom-0 inset-x-0 px-2 pb-1.5 text-[10px] font-bold text-white leading-tight text-center">เดิม</p>
              </div>
            </div>
            {/* Generated styles */}
            {generated.selected.map((style) => {
              const isActive = style.id === selectedStyle?.id;
              const displayImage = style.image;
              return (
                <div key={style.id} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedStyleId(style.id)}
                    className={`group relative w-full overflow-hidden rounded-2xl transition-all duration-200 ${
                      isActive
                        ? "ring-2 ring-primary shadow-lg shadow-primary/25 scale-[1.03]"
                        : !style.image
                        ? "ring-1 ring-muted/60 opacity-60"
                        : "ring-1 ring-muted/60 hover:ring-primary/50 hover:shadow-md"
                    }`}
                  >
                    <div className="relative aspect-[3/4] w-full bg-muted/30">
                      {displayImage ? (
                        <Image
                          src={displayImage}
                          alt={style.name}
                          fill
                          className={`object-cover transition-transform duration-300 group-hover:scale-105 ${!style.image ? "grayscale" : ""}`}
                          sizes="25vw"
                          quality={95}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
                      <p className="absolute bottom-0 inset-x-0 px-2 pb-1.5 text-[10px] font-bold text-white leading-tight text-center">{style.name}</p>
                      {isActive && (
                        <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={!style.image || downloadingImageKey !== null}
                    onClick={() => void handleDownloadImage(
                      style.image,
                      `style:${style.id}`,
                      `${sanitizeFilenamePart(style.name)}-${sanitizeFilenamePart(style.id)}.png`,
                      { style: style.name, color: "Original" }
                    )}
                    className="flex items-center justify-center gap-1 rounded-xl border bg-background py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-40"
                  >
                    {downloadingImageKey === `style:${style.id}` ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> บันทึก</>
                    ) : (
                      <><Download className="h-3 w-3" /> บันทึก</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── New Preview Area (Moved from top) ── */}
      <div className="relative px-1">
        <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-[40px] bg-muted/20 shadow-xl ring-1 ring-black/5 dark:bg-muted/5">
          {selectedStylePreview ? (
            <Image
              src={selectedStylePreview}
              alt={selectedStyle?.name || "Selected style"}
              fill
              className="object-cover transition-transform duration-700 hover:scale-105"
              priority
              sizes="480px"
              quality={100}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm">เลือกทรงผมด้านบนเพื่อดูรูปขยาย</p>
            </div>
          )}
          
          {selectedStylePreview && (
            <>
              {/* subtle overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              
              {/* info & actions */}
              <div className="absolute bottom-6 inset-x-6 flex items-end justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white tracking-tight">{selectedStyle?.name}</h2>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md uppercase tracking-wider border border-white/10">
                      <Sparkles className="h-3 w-3" />
                      AI Portrait
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedStyle?.image && (
                    <button
                      onClick={() => void handleDownloadImage(
                        selectedStyle.image,
                        `hero:${selectedStyle.id}`,
                        `hairai-${sanitizeFilenamePart(selectedStyle.name)}.png`,
                        { style: selectedStyle.name, color: "Original" }
                      )}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all"
                    >
                      {downloadingImageKey === `hero:${selectedStyle.id}` ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Generation Time Badge */}
        {generationTime && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md border border-white/10 shadow-lg">
              <Clock className="h-3 w-3" />
              <span>AI Generation: {generationTime.toFixed(1)}s</span>
            </div>
          </div>
        )}
      </div>

      {/* ── STEP 2: Hair Color ── */}
        {selectedStyle ? (
          <div className="space-y-4">
            {/* Color picker */}
            <div className="rounded-3xl border bg-card p-4 space-y-3 dark:bg-background/40">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">เลือกสีผม</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {data.recommendedColors.map((color) => {
                  const isSelected = selectedColorNames.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => toggleColorSelection(color.name)}
                      className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all duration-150 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                          : "border-muted/60 hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <span
                        className="h-7 w-7 shrink-0 rounded-full border-2 border-white shadow-md"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-tight">{color.name}</span>
                        <span className="block text-xs text-muted-foreground">{color.tone}</span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted/50 text-transparent"
                      }`}>
                        <Check className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>


            {/* Generate button */}
            <Button
              type="button"
              className="w-full h-12 rounded-2xl font-bold text-sm"
              onClick={handleGenerateColorPreviews}
              disabled={isGeneratingColors || !selectedStyle.image || selectedColors.length === 0}
            >
              {isGeneratingColors ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังจำลองสีผม...</>
              ) : hasGeneratedCurrentStyleColors ? (
                <><RefreshCw className="mr-2 h-4 w-4" /> ลองจำลองสีผมอีกครั้ง</>
              ) : (
                <><Palette className="mr-2 h-4 w-4" /> จำลองสีผมบนทรงที่เลือก</>
              )}
            </Button>

            {/* Color result grid */}
            {selectedColors.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">ผลลัพธ์สีผม</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedColors.map((color, i) => {
                    const previewImage = colorPreviews[color.name];
                    return (
                      <div key={i} className="group relative overflow-hidden rounded-2xl bg-muted/30 ring-1 ring-muted/60">
                        <div className="relative aspect-[3/4] w-full">
                          {previewImage ? (
                            <Image
                              src={previewImage}
                              alt={color.name}
                              fill
                              className="object-cover"
                              quality={95}
                              sizes="(max-width: 768px) 50vw, 260px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted/50">
                              {isGeneratingColors ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <div
                                    className="h-12 w-12 rounded-full border-4 border-white shadow-lg"
                                    style={{ backgroundColor: color.hex }}
                                  />
                                  <p className="text-xs text-muted-foreground text-center px-2">กดจำลองสีผม</p>
                                </div>
                              )}
                            </div>
                          )}
                          {/* color swatch + name overlay */}
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent" />
                          <div className="absolute bottom-0 inset-x-0 flex items-center gap-1.5 px-2.5 pb-2">
                            <span
                              className="h-4 w-4 shrink-0 rounded-full border border-white/60 shadow"
                              style={{ backgroundColor: color.hex }}
                            />
                            <span className="text-[11px] font-bold text-white leading-tight">{color.name}</span>
                          </div>
                          {/* download hover overlay */}
                          {previewImage && (
                            <button
                              type="button"
                              disabled={downloadingImageKey !== null}
                              onClick={() => void handleDownloadImage(
                                previewImage,
                                `color:${selectedStyle.id}:${color.name}`,
                                `${sanitizeFilenamePart(selectedStyle.name)}-${sanitizeFilenamePart(color.name)}.png`,
                                { style: selectedStyle.name, color: color.name, colorHex: color.hex }
                              )}
                              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/60 disabled:opacity-30"
                            >
                              {downloadingImageKey === `color:${selectedStyle.id}:${color.name}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {isGeneratingColors && (
                  <p className="text-center text-xs text-muted-foreground">AI กำลังสร้างตัวอย่างสีผม...</p>
                )}
                {!isGeneratingColors && !selectedStyle.image && (
                  <p className="text-center text-xs text-muted-foreground">ทรงนี้สร้างไม่สำเร็จ กรุณาเลือกทรงอื่น</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-muted/20 py-10 text-center">
            <Palette className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">เลือกทรงผมด้านบนก่อน<br />เพื่อเริ่มจำลองสีผม</p>
          </div>
        )}
      </div>
    </div>
  );
}
