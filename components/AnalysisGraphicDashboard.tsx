"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, RotateCcw, Loader2, Clock } from "lucide-react";

interface AnalysisGraphicDashboardProps {
  image: string;
  model?: string;
  onClearCacheAndReanalyze: () => Promise<void>;
  isReanalyzing?: boolean;
  onReset: () => void;
  generationTime?: number | null;
}

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

export function AnalysisGraphicDashboard({
  image,
  model,
  onClearCacheAndReanalyze,
  isReanalyzing = false,
  onReset,
  generationTime,
}: AnalysisGraphicDashboardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadImage(image, `${sanitizeFilenamePart("hair-analysis")}.png`);
    } finally {
      setIsDownloading(false);
    }
  };
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-4 pt-6 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">Analysis</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/80">AI Insight Graphic</p>
        </div>
        <button
          onClick={onReset}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 text-secondary-foreground backdrop-blur-md transition-all hover:bg-secondary hover:scale-105 active:scale-95 shadow-sm border border-white/20"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Graphic Card ── */}
      <div className="relative overflow-hidden rounded-[36px] border border-white/20 bg-card shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-2">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[30px] bg-muted/10">
          <Image
            src={image}
            alt="Hair analysis graphic"
            fill
            className="object-contain p-4"
            priority
            sizes="480px"
          />
          {/* Generation Time Badge */}
          {generationTime && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md border border-white/10 shadow-lg">
                <Clock className="h-3 w-3" />
                <span>AI Analysis: {generationTime.toFixed(1)}s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Info & Actions ── */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            วิเคราะห์รูปหน้าและสภาพเส้นผมของคุณเรียบร้อยแล้ว<br/>
            คุณสามารถบันทึกรูปเพื่อนำไปปรึกษาช่างทำผมได้ทันที
          </p>
        </div>

      {/* ── Action Buttons (Normal Flow) ── */}
      <div className="pt-4 px-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            type="button"
            variant="secondary"
            className="h-14 text-sm font-bold rounded-2xl border"
            onClick={() => void onClearCacheAndReanalyze()}
            disabled={isReanalyzing}
          >
            {isReanalyzing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Rebuilding
              </>
            ) : (
              <>
                <RotateCcw className="h-5 w-5 mr-2" /> Clear Cache
              </>
            )}
          </Button>
          <Button
            className="h-14 text-base font-bold rounded-2xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 shadow-sm"
            disabled={isDownloading || isReanalyzing}
            onClick={handleDownload}
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Downloading
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" /> Download
              </>
            )}
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}