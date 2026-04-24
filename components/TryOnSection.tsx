"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import { getSalonCatalogByGender, type SalonStyleGender } from "@/lib/salon-style-catalog";
import { ALL_HAIR_COLOR_RECOMMENDATIONS, MAX_HAIRSTYLE_PREVIEW_COUNT } from "@/lib/tryOnConfig";
import { Camera, Upload, RefreshCw, Sparkles, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { AnalysisGraphicDashboard } from "./AnalysisGraphicDashboard";

interface GeneratedStyle {
  id: string;
  name: string;
  label: string;
  image: string | null;
  previewImage: string;
  referenceImage: string;
}

interface AnalysisViewData {
  recommendedColors: { name: string; hex: string; tone: string }[];
  generatedStyles: {
    model?: string;
    selected: GeneratedStyle[];
  };
}

interface AnalysisGraphicViewData {
  image: string;
  model?: string;
}

type BatchHairJobStatus = "processing" | "completed" | "failed";
type PostPhotoFlow = "styles" | "analysis";

interface BatchHairJobResponse {
  jobId?: string;
  status?: BatchHairJobStatus;
  error?: string;
  model?: string;
  selected?: GeneratedStyle[];
  completedCount?: number;
  totalCount?: number;
  cached?: boolean;
}

const MAX_UPLOAD_DIMENSION = 1280;
const UPLOAD_IMAGE_QUALITY = 0.78;
const BATCH_JOB_POLL_DELAY_MS = 350;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getBatchProgressLabel(
  completedCount: number,
  totalCount: number,
  status: BatchHairJobStatus,
  cached = false
) {
  if (cached && status === "completed") {
    return `โหลดผลลัพธ์จากแคช ${totalCount}/${totalCount}`;
  }

  if (status === "completed") {
    return `AI สร้างทรงผมเสร็จ ${completedCount}/${totalCount}`;
  }

  const nextIndex = Math.min(completedCount + 1, totalCount);

  if (completedCount > 0) {
    return `สร้างเสร็จ ${completedCount}/${totalCount} กำลังสร้างทรงที่ ${nextIndex}/${totalCount}`;
  }

  return `กำลังสร้างทรงที่ 1/${totalCount}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getDefaultSelectedStyleIds(gender: SalonStyleGender) {
  return getSalonCatalogByGender(gender)
    .slice(0, MAX_HAIRSTYLE_PREVIEW_COUNT)
    .map((style) => style.id);
}

async function compressImageDataUrl(dataUrl: string) {
  const image = new window.Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to load image for compression"));
    image.src = dataUrl;
  });

  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > MAX_UPLOAD_DIMENSION ? MAX_UPLOAD_DIMENSION / longestSide : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to initialize image compression canvas");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL("image/jpeg", UPLOAD_IMAGE_QUALITY);
}

export function TryOnSection() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisViewData | null>(null);
  const [analysisGraphicData, setAnalysisGraphicData] = useState<AnalysisGraphicViewData | null>(null);
  const [isReanalyzingGraphic, setIsReanalyzingGraphic] = useState(false);
  const [postPhotoFlow, setPostPhotoFlow] = useState<PostPhotoFlow>("styles");
  const [gender, setGender] = useState<SalonStyleGender>("female");
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>(getDefaultSelectedStyleIds("female"));
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const salonCatalog = getSalonCatalogByGender(gender);

  const handleGenderChange = (nextGender: SalonStyleGender) => {
    setGender(nextGender);
    setSelectedStyleIds(getDefaultSelectedStyleIds(nextGender));
  };

  const toggleStyleSelection = (styleId: string) => {
    setSelectedStyleIds((current) => {
      if (current.includes(styleId)) {
        return current.filter((id) => id !== styleId);
      }

      if (current.length >= MAX_HAIRSTYLE_PREVIEW_COUNT) {
        toast.info(`เลือกได้ครบ ${MAX_HAIRSTYLE_PREVIEW_COUNT} ทรงแล้ว`, {
          description: "คุณสามารถกดเริ่มจำลองทรงผมได้ทันทีที่ปุ่มด้านล่าง",
          id: "hairstyle-max-limit",
        });
        return current;
      }

      return [...current, styleId];
    });
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", aspectRatio: 3/4 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาต");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const longestSide = Math.max(video.videoWidth, video.videoHeight);
      const scale = longestSide > MAX_UPLOAD_DIMENSION ? MAX_UPLOAD_DIMENSION / longestSide : 1;
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      // Keep captured output consistent with mirrored selfie preview.
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/jpeg", UPLOAD_IMAGE_QUALITY);
      setSelectedImage(dataUrl);
      setAnalysisData(null);
      setAnalysisGraphicData(null);
      stopCamera();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressedImage = await compressImageDataUrl(reader.result as string);
          setSelectedImage(compressedImage);
          setAnalysisData(null);
          setAnalysisGraphicData(null);
        } catch (error: unknown) {
          console.error("Upload compression error:", error);
          alert("ไม่สามารถย่อภาพได้ กรุณาลองใหม่อีกครั้ง");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    if (selectedStyleIds.length !== MAX_HAIRSTYLE_PREVIEW_COUNT) {
      alert(`กรุณาเลือกทรงผมให้ครบ ${MAX_HAIRSTYLE_PREVIEW_COUNT} ทรง`);
      return;
    }

    setIsProcessing(true);
    setProcessingStep("กำลังเตรียมข้อมูลภาพ...");
    setGenerationTime(null);
    const startTime = Date.now();
    
    try {
      const recommendationResult = {
        recommendedColors: ALL_HAIR_COLOR_RECOMMENDATIONS,
      };

      const response = await fetch("/api/batch-hair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: selectedImage,
          selectedStyleIds,
        }),
      });

      const batchData = (await response.json()) as {
        error?: string;
        model?: string;
        selected?: GeneratedStyle[];
        jobId?: string;
        status?: BatchHairJobStatus;
        completedCount?: number;
        totalCount?: number;
        cached?: boolean;
      };

      if (!response.ok || batchData.error) {
        throw new Error(batchData.error || "Failed to generate hairstyles");
      }

      const totalCount = batchData.totalCount ?? selectedStyleIds.length;
      const initialCompletedCount = batchData.completedCount ?? 0;
      const initialStatus = batchData.status ?? (batchData.selected ? "completed" : "processing");

      setProcessingStep(getBatchProgressLabel(initialCompletedCount, totalCount, initialStatus, batchData.cached));

      let completedBatchData: BatchHairJobResponse = batchData;

      if (initialStatus === "processing") {
        if (!batchData.jobId) {
          throw new Error("Batch hairstyle job did not return a job id");
        }

        while (true) {
          await wait(BATCH_JOB_POLL_DELAY_MS);

          const jobResponse = await fetch(`/api/batch-hair?jobId=${encodeURIComponent(batchData.jobId)}`, {
            cache: "no-store",
          });

          const jobData = (await jobResponse.json()) as BatchHairJobResponse;

          if (jobData.error) {
            throw new Error(jobData.error);
          }

          const jobStatus = jobData.status ?? "processing";
          const jobCompletedCount = jobData.completedCount ?? 0;
          const jobTotalCount = jobData.totalCount ?? totalCount;

          setProcessingStep(getBatchProgressLabel(jobCompletedCount, jobTotalCount, jobStatus));

          if (jobStatus === "completed") {
            completedBatchData = jobData;
            break;
          }

          if (jobStatus === "failed") {
            throw new Error(jobData.error || "Failed to generate hairstyles");
          }

          if (!jobResponse.ok && jobResponse.status !== 202) {
            throw new Error("Failed to read hairstyle progress");
          }
        }
      }

      const selected = completedBatchData.selected ?? [];

      if (selected.length !== selectedStyleIds.length) {
        throw new Error(`AI สร้างทรงผมไม่ครบ ${MAX_HAIRSTYLE_PREVIEW_COUNT} ทรง กรุณาลองใหม่อีกครั้ง`);
      }

      const duration = (Date.now() - startTime) / 1000;
      setGenerationTime(duration);
      setAnalysisData({
        recommendedColors: ALL_HAIR_COLOR_RECOMMENDATIONS,
        generatedStyles: {
          model: completedBatchData.model,
          selected: completedBatchData.selected || [],
        },
      });
    } catch (error: unknown) {
      console.error("Analysis error:", error);
      alert("เกิดข้อผิดพลาด: " + getErrorMessage(error));
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleAnalyzeGraphic = async (forceRefresh = false) => {
    if (!selectedImage) {
      return;
    }

    if (forceRefresh) {
      setIsReanalyzingGraphic(true);
    } else {
      setIsProcessing(true);
      setProcessingStep("AI กำลังวิเคราะห์รูปและสร้างอินโฟกราฟิก...");
      setGenerationTime(null);
    }
    const startTime = Date.now();

    try {
      const response = await fetch("/api/analyze-graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: selectedImage, forceRefresh }),
      });

      const result = (await response.json()) as {
        error?: string;
        image?: string;
        model?: string;
      };

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to generate analysis graphic");
      }

      if (!result.image) {
        throw new Error("AI did not return an analysis graphic");
      }

      const duration = (Date.now() - startTime) / 1000;
      setGenerationTime(duration);
      setAnalysisGraphicData({
        image: result.image,
        model: result.model,
      });
    } catch (error: unknown) {
      console.error("Analysis graphic error:", error);
      alert("เกิดข้อผิดพลาด: " + getErrorMessage(error));
    } finally {
      if (forceRefresh) {
        setIsReanalyzingGraphic(false);
      } else {
        setIsProcessing(false);
        setProcessingStep("");
      }
    }
  };

  if (analysisData) {
    return (
      <AnalysisDashboard 
        data={analysisData} 
        userImage={selectedImage!}
        onReset={() => {
          setAnalysisData(null);
          setSelectedImage(null);
          setAnalysisGraphicData(null);
          setSelectedStyleIds(getDefaultSelectedStyleIds(gender));
        }}
      />
    );
  }

  if (analysisGraphicData) {
    return (
      <AnalysisGraphicDashboard
        image={analysisGraphicData.image}
        model={analysisGraphicData.model}
        isReanalyzing={isReanalyzingGraphic}
        onClearCacheAndReanalyze={async () => {
          await handleAnalyzeGraphic(true);
        }}
        onReset={() => {
          setAnalysisGraphicData(null);
          setAnalysisData(null);
          setSelectedImage(null);
          setIsReanalyzingGraphic(false);
          setSelectedStyleIds(getDefaultSelectedStyleIds(gender));
        }}
      />
    );
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-6 px-4 pt-5 pb-36 sm:px-5 md:px-6 md:pt-6 md:pb-40">
      <div className="flex items-start justify-between gap-3 rounded-[28px] border border-white/60 bg-white/75 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur sm:px-5 dark:border-white/8 dark:bg-white/5 dark:shadow-none">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary/80">Hair Preview Studio</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.9rem]">ออกแบบทรงผมให้เหมาะกับใบหน้าบนมือถือและแท็บเล็ต</h1>
          <p className="max-w-[56ch] text-sm leading-6 text-muted-foreground sm:text-[15px]">
            อัปโหลดรูปครั้งเดียว แล้วเลือกว่าจะให้ AI จำลองทรงผมหรือสร้างอินโฟกราฟิกวิเคราะห์เส้นผมใน flow ที่อ่านง่ายและกดใช้งานสะดวกบนจอสัมผัส
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 rounded-full border border-primary/15 bg-primary/6 px-3.5 py-2 text-xs font-semibold text-primary">
          <Sparkles className="h-4 w-4" />
          Touch-first UI
        </div>
      </div>

      <div className={`grid gap-6 ${selectedImage ? "grid-cols-1" : ""}`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="rounded-xl bg-primary/10 p-1.5">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">1. ถ่ายรูปของคุณ</h2>
              <p className="text-sm text-muted-foreground">ภาพแนวตั้งคมชัดจะช่วยให้ผลลัพธ์ AI สวยและแม่นยำขึ้น</p>
            </div>
        </div>
        
          <div className="relative aspect-[3/4] overflow-hidden rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(250,244,246,0.84))] shadow-[0_18px_48px_rgba(15,23,42,0.08)] md:h-[460px] md:aspect-auto lg:h-auto lg:aspect-[3/4] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
            <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between rounded-full bg-black/35 px-3 py-2 text-[11px] font-semibold tracking-[0.18em] text-white/85 backdrop-blur-sm">
              <span>Portrait Frame</span>
              <span>3:4</span>
            </div>
          {isCameraOpen ? (
            <div className="relative w-full h-full bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover object-center scale-x-[-1]" 
              />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
              <Button
                size="icon"
                variant="secondary"
                className="absolute right-4 top-4 h-11 w-11 rounded-full border border-white/30 bg-black/45 text-white shadow-lg backdrop-blur"
                onClick={stopCamera}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
              <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2">
                <Button
                  size="lg"
                  className="h-20 w-20 rounded-full border-[5px] border-white/80 bg-white/90 p-0 shadow-2xl hover:bg-white"
                  onClick={capturePhoto}
                >
                  <div className="h-10 w-10 rounded-full bg-primary" />
                </Button>
                <p className="text-[11px] font-semibold tracking-wide text-white/90">Tap to capture</p>
              </div>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-72 border-2 border-white/40 rounded-[100px] border-dashed" />
              </div>
            </div>
          ) : selectedImage ? (
            <div className="relative w-full h-full group">
              <Image
                src={selectedImage}
                alt="Uploaded"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Button 
                variant="secondary" 
                className="absolute bottom-4 right-4 rounded-full border border-white/55 bg-background/82 shadow-lg backdrop-blur-md hover:bg-background"
                onClick={() => setSelectedImage(null)}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> ถ่ายใหม่
              </Button>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col justify-center gap-10 p-6 sm:p-8">
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/70 bg-background/92 shadow-sm dark:border-white/10 dark:bg-white/8">
                <Camera className="h-8 w-8 text-primary" />
              </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold">เพิ่มรูปภาพของคุณ</p>
                  <p className="px-4 text-sm text-muted-foreground">
                  ถ่ายรูปหน้าตรงเพื่อให้ AI สร้างตัวอย่างทรงผมบนใบหน้าของคุณ
                </p>
              </div>
              </div>
              <div className="grid gap-3 sm:px-4">
                <Button size="lg" className="h-14 w-full rounded-2xl text-base shadow-md gap-2" onClick={startCamera}>
                  <Camera className="h-5 w-5" /> เปิดกล้องถ่ายรูป
                </Button>
                <Button variant="secondary" size="lg" className="h-14 w-full rounded-2xl border border-white/65 bg-background/85 text-base shadow-sm gap-2 dark:border-white/10 dark:bg-white/8" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-5 w-5" /> เลือกจากคลังภาพ
                </Button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center z-50 transition-all text-center p-6">
              <div className="relative w-24 h-24 mb-6">
                <Loader2 className="h-full w-full text-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                </div>
              </div>
              <p className="text-xl font-bold tracking-tight mb-2 text-foreground">{processingStep}</p>
              <p className="text-sm text-muted-foreground">AI กำลังทำงาน อาจใช้เวลาประมาณ 20-30 วินาที</p>
            </div>
          )}
          </div>

          <div className="grid gap-3 rounded-[28px] border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground sm:grid-cols-3 dark:border-primary/16 dark:bg-primary/8">
            <div>
              <p className="font-semibold text-foreground">มุมกล้อง</p>
              <p>มองตรง กลางเฟรม</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">แสง</p>
              <p>สว่างนุ่ม ไม่มีเงาแรง</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">พื้นหลัง</p>
              <p>เรียบเพื่อช่วยตัดผมชัดขึ้น</p>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Step 2: Gender Selection & Analyze */}
        {selectedImage && !isProcessing && (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5">

            <div className="rounded-[32px] border border-white/60 bg-white/78 p-4 shadow-[0_14px_44px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5 dark:border-white/8 dark:bg-white/5 dark:shadow-none">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">Workflow</p>
                  <h3 className="text-xl font-bold tracking-tight">2. เลือกรูปแบบการใช้งาน</h3>
                </div>
                <div className="hidden sm:flex rounded-full bg-muted/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  เลือก flow ที่เหมาะกับงานของคุณ
                </div>
              </div>

          {/* Mode switcher */}
          <div className="flex gap-2 rounded-2xl bg-muted/60 p-1.5">
            {(["styles", "analysis"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPostPhotoFlow(mode)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 ${
                  postPhotoFlow === mode
                    ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "styles" ? (
                  <><User className="h-4 w-4" /> เลือกทรงผม</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> วิเคราะห์จากรูป</>
                )}
              </button>
            ))}
          </div>

          {postPhotoFlow === "styles" && (
            <div className="space-y-6 pb-28 pt-5">

              {/* Gender selection */}
              <div className="space-y-3 rounded-[28px] border border-border/60 bg-card/72 p-4 sm:p-5 dark:bg-card/45">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
                  เลือกเพศ
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleGenderChange("male")}
                    className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 border-2 ${
                      gender === "male"
                        ? "border-blue-500 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950/60 dark:to-sky-900/40 shadow-md shadow-blue-200/50 dark:shadow-blue-900/30"
                        : "border-muted bg-muted/30 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                    }`}
                  >
                    <span className="block text-3xl mb-2">👨</span>
                    <span className="block text-base font-bold leading-tight">ผู้ชาย</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Male styles</span>
                    {gender === "male" && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderChange("female")}
                    className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 border-2 ${
                      gender === "female"
                        ? "border-pink-500 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-950/60 dark:to-rose-900/40 shadow-md shadow-pink-200/50 dark:shadow-pink-900/30"
                        : "border-muted bg-muted/30 hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-950/20"
                    }`}
                  >
                    <span className="block text-3xl mb-2">👩</span>
                    <span className="block text-base font-bold leading-tight">ผู้หญิง</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">Female styles</span>
                    {gender === "female" && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-white">
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Hairstyle catalog */}
              <div className="space-y-3 rounded-[28px] border border-border/60 bg-card/72 p-4 sm:p-5 dark:bg-card/45">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    เลือกทรงผม
                  </p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    selectedStyleIds.length === MAX_HAIRSTYLE_PREVIEW_COUNT
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {selectedStyleIds.length} / {MAX_HAIRSTYLE_PREVIEW_COUNT}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {salonCatalog.map((style) => {
                    const isSelected = selectedStyleIds.includes(style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => toggleStyleSelection(style.id)}
                        className={`group relative w-full overflow-hidden rounded-2xl text-left transition-all duration-200 ${
                          isSelected
                            ? "ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]"
                            : "ring-1 ring-muted/60 hover:ring-primary/50 hover:shadow-md"
                        }`}
                      >
                        <div className="relative aspect-[3/4] w-full bg-muted/30">
                          <Image
                            src={style.previewImage}
                            alt={style.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 50vw, 220px"
                          />
                          {/* gradient overlay for name */}
                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
                          <p className="absolute bottom-0 inset-x-0 px-3 pb-2.5 text-sm font-bold text-white leading-tight">
                            {style.name}
                          </p>
                          {/* selected checkmark */}
                          {isSelected ? (
                            <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          ) : (
                            <span className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white border border-white/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M8 4v8M4 8h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {postPhotoFlow === "analysis" && (
            <div className="space-y-4 pb-28 pt-5">
              <div className="relative overflow-hidden rounded-[28px] border bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 shadow-sm">
                <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">AI Hair Analysis</h3>
                  <p className="text-sm text-muted-foreground leading-6">
                    AI จะวิเคราะห์รูปหน้า เนื้อผม ความหนา แนวแสก หน้าม้า ความยาวผม และสีผมที่เหมาะ พร้อมสร้างอินโฟกราฟิกสรุปให้อัตโนมัติ
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["รูปหน้า", "เนื้อผม", "ทรงที่เหมาะ", "สีผมแนะนำ"].map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
            </div>

          <div className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] -translate-x-1/2 rounded-[30px] border border-rose-200/55 bg-gradient-to-t from-rose-50/96 to-white/92 p-3 shadow-[0_16px_40px_rgba(244,63,94,0.14)] backdrop-blur-xl dark:border-rose-900/45 dark:bg-[linear-gradient(180deg,rgba(37,24,29,0.95),rgba(24,24,27,0.9))] sm:w-[calc(100%-1.5rem)] md:w-[min(440px,calc(100%-3rem))]">
            <div className="mx-auto max-w-[440px]">
              {postPhotoFlow === "styles" ? (
                <Button
                  className="h-14 w-full rounded-2xl border-0 bg-gradient-to-r from-rose-600 to-pink-500 text-base font-bold text-white shadow-lg shadow-rose-400/25 hover:from-rose-700 hover:to-pink-600 disabled:from-muted disabled:to-muted disabled:text-muted-foreground disabled:shadow-none"
                  onClick={handleAnalyze}
                  disabled={selectedStyleIds.length !== MAX_HAIRSTYLE_PREVIEW_COUNT}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {selectedStyleIds.length === MAX_HAIRSTYLE_PREVIEW_COUNT
                    ? `ให้ AI สร้าง ${MAX_HAIRSTYLE_PREVIEW_COUNT} ทรงบนใบหน้าของคุณ`
                    : `เลือกทรงผมให้ครบ ${MAX_HAIRSTYLE_PREVIEW_COUNT} ทรง`}
                </Button>
              ) : (
                <Button
                  className="h-14 w-full rounded-2xl border-0 bg-gradient-to-r from-rose-600 to-pink-500 text-base font-bold text-white shadow-lg shadow-rose-400/25 hover:from-rose-700 hover:to-pink-600"
                  onClick={() => { void handleAnalyzeGraphic(); }}
                >
                  <Sparkles className="h-5 w-5 mr-2" /> ให้ AI วิเคราะห์จากรูปถ่ายนี้
                </Button>
              )}
            </div>
          </div>
          </div>
        )}
      </div>
    </section>
  );
}
