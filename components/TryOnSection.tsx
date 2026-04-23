"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, RefreshCw, Sparkles, User, Loader2 } from "lucide-react";
import { AnalysisDashboard } from "./AnalysisDashboard";

export function TryOnSection() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [gender, setGender] = useState<"male" | "female">("female");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setSelectedImage(dataUrl);
      setAnalysisData(null);
      stopCamera();
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysisData(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setProcessingStep("กำลังวิเคราะห์และสร้างทรงผมที่เหมาะกับคุณ 8 แบบ...");
    
    try {
      // Fallback/Default analysis stats
      const analysisResult = {
        faceShape: "Oval",
        hairTexture: "Straight to Wavy",
        density: "Medium to Thick",
        vibe: "Clean & Natural",
        recommendedColors: [
          { name: "Dark Brown", hex: "#4a3728", tone: "Warm" },
          { name: "Ash Brown", hex: "#7a6a5d", tone: "Neutral" },
          { name: "Milk Brown", hex: "#9b7e6b", tone: "Soft" },
        ],
        suitability: [
          { label: "ความเข้ากันของโครงหน้า", value: 88 },
          { label: "เทรนด์ปัจจุบัน", value: 82 },
          { label: "ความง่ายในการดูแล", value: 75 },
        ],
      };

      // Call batch-hair API
      const batchRes = await fetch("/api/batch-hair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: selectedImage, gender }),
      });

      const batchData = await batchRes.json();

      if (batchData.error) {
        throw new Error(batchData.error);
      }

      setAnalysisData({
        ...analysisResult,
        generatedStyles: batchData,
      });
    } catch (err: any) {
      console.error("Analysis error:", err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  if (analysisData) {
    return (
      <AnalysisDashboard 
        data={analysisData} 
        userImage={selectedImage!} 
        onSelectStyle={() => {}} // No longer using try-on
        onReset={() => {
          setAnalysisData(null);
          setSelectedImage(null);
        }}
      />
    );
  }

  return (
    <section className="flex flex-col gap-6 px-4 pt-4 pb-32 max-w-[480px] mx-auto min-h-screen">
      {/* Step 1: Your Photo */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">1. ถ่ายรูปของคุณ</h2>
        </div>
        
        <div className="relative aspect-[3/4] rounded-3xl border-2 border-muted-foreground/10 flex items-center justify-center bg-muted/20 overflow-hidden shadow-inner">
          {isCameraOpen ? (
            <div className="relative w-full h-full bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover scale-x-[-1]" 
              />
              <div className="absolute inset-x-0 bottom-8 flex justify-center gap-6 px-6">
                <Button size="lg" variant="secondary" className="rounded-full w-14 h-14 p-0 shadow-lg" onClick={stopCamera}>
                  <RefreshCw className="h-6 w-6" />
                </Button>
                <Button size="lg" className="rounded-full w-20 h-20 bg-white hover:bg-zinc-200 border-4 border-white/20 p-0 shadow-xl" onClick={capturePhoto}>
                  <div className="w-12 h-12 rounded-full bg-primary" />
                </Button>
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
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Button 
                variant="secondary" 
                className="absolute bottom-4 right-4 rounded-full shadow-lg backdrop-blur-md bg-background/80 hover:bg-background"
                onClick={() => setSelectedImage(null)}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> ถ่ายใหม่
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-6 p-8 w-full">
              <div className="mx-auto w-20 h-20 rounded-full bg-background shadow-sm border flex items-center justify-center">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold">เพิ่มรูปภาพของคุณ</p>
                <p className="text-sm text-muted-foreground px-4">
                  ถ่ายรูปหน้าตรงเพื่อวิเคราะห์โครงหน้าและทรงผมที่เหมาะ
                </p>
              </div>
              <div className="flex flex-col gap-3 px-4">
                <Button size="lg" className="h-14 w-full text-base rounded-2xl shadow-md gap-2" onClick={startCamera}>
                  <Camera className="h-5 w-5" /> เปิดกล้องถ่ายรูป
                </Button>
                <Button variant="secondary" size="lg" className="h-14 w-full text-base rounded-2xl bg-background shadow-sm gap-2" onClick={() => fileInputRef.current?.click()}>
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
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Step 2: Gender Selection & Analyze */}
      {selectedImage && !isProcessing && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <div className="bg-primary/10 p-1.5 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">2. เลือกเพศของคุณ</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant={gender === "male" ? "default" : "outline"}
                className={`h-24 rounded-2xl flex flex-col gap-2 border-2 ${gender === "male" ? "border-primary" : "border-muted"}`}
                onClick={() => setGender("male")}
              >
                <span className="text-2xl">👨</span>
                <span className="font-bold text-base">เพศชาย</span>
              </Button>
              <Button 
                variant={gender === "female" ? "default" : "outline"}
                className={`h-24 rounded-2xl flex flex-col gap-2 border-2 ${gender === "female" ? "border-primary" : "border-muted"}`}
                onClick={() => setGender("female")}
              >
                <span className="text-2xl">👩</span>
                <span className="font-bold text-base">เพศหญิง</span>
              </Button>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t z-50">
            <div className="max-w-[480px] mx-auto">
              <Button 
                className="w-full h-16 text-xl font-bold rounded-2xl shadow-primary/20 shadow-xl" 
                onClick={handleAnalyze}
              >
                <Sparkles className="h-5 w-5 mr-2" /> วิเคราะห์รูปภาพ
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
