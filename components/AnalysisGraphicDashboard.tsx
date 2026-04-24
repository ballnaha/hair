"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, RotateCcw, Loader2 } from "lucide-react";

interface AnalysisGraphicDashboardProps {
  image: string;
  model?: string;
  onClearCacheAndReanalyze: () => Promise<void>;
  isReanalyzing?: boolean;
  onReset: () => void;
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
}: AnalysisGraphicDashboardProps) {
  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-28 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase">Hair Analysis</h2>
          <p className="text-xs text-muted-foreground">
            AI-generated hair analysis infographic from the uploaded portrait{model ? ` using ${model}` : ""}
          </p>
        </div>
        <button
          onClick={onReset}
          className="text-primary flex items-center gap-1.5 text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-full"
        >
          <RefreshCw className="h-3 w-3" /> Start Over
        </button>
      </div>

      <div className="rounded-3xl border bg-card p-3 shadow-md">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted/40">
          <Image
            src={image}
            alt="Hair analysis graphic"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 540px"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t z-50">
        <div className="max-w-[480px] mx-auto grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant="secondary"
            className="h-14 text-sm font-bold rounded-2xl"
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
            type="button"
            variant="outline"
            className="h-14 text-base font-bold rounded-2xl"
            disabled={isReanalyzing}
            onClick={() => void downloadImage(image, `${sanitizeFilenamePart("hair-analysis")}.png`)}
          >
            <Download className="h-5 w-5 mr-2" /> Download
          </Button>
          <Button
            className="h-14 text-base font-bold rounded-2xl"
            disabled={isReanalyzing}
            onClick={onReset}
          >
            <RefreshCw className="h-5 w-5 mr-2" /> New Photo
          </Button>
        </div>
      </div>
    </div>
  );
}