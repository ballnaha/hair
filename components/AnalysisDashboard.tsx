"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  User,
  CheckCircle2,
  XCircle,
  Palette,
  Layout,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Scissors,
  Ruler,
  Loader2,
} from "lucide-react";
import Image from "next/image";

interface StyleResult {
  name: string;
  label: string;
  group: string;
  style: string;
  image: string | null;
}

interface AnalysisData {
  faceShape: string;
  hairTexture: string;
  density: string;
  vibe: string;
  recommendedColors: { name: string; hex: string; tone: string }[];
  suitability: { label: string; value: number }[];
  // AI-generated images grouped
  generatedStyles?: {
    best: StyleResult[];
    notRecommended: StyleResult[];
    length: StyleResult[];
    fringe: StyleResult[];
  };
}

function StyleCard({
  style,
  showLabel = true,
  grayscale = false,
  onClick,
}: {
  style: StyleResult;
  showLabel?: boolean;
  grayscale?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${onClick ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
      onClick={onClick}
    >
      <div
        className={`relative aspect-[3/4] w-full rounded-xl overflow-hidden border-2 ${
          grayscale ? "border-red-200/50 opacity-60" : "border-muted hover:border-primary transition-colors"
        }`}
      >
        {style.image ? (
          <Image
            src={style.image}
            alt={style.name}
            fill
            className={`object-cover ${grayscale ? "grayscale" : ""}`}
            sizes="(max-width: 768px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full bg-muted/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          </div>
        )}
      </div>
      {showLabel && (
        <div className="text-center px-1">
          <p className="text-[10px] font-black uppercase leading-tight tracking-wide">{style.name}</p>
          <p className="text-[9px] text-muted-foreground leading-tight">{style.label}</p>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  color = "text-foreground",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <div>
        <h3 className={`text-sm font-black uppercase tracking-wide ${color}`}>{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function AnalysisDashboard({
  data,
  userImage,
  onSelectStyle,
  onReset,
}: {
  data: AnalysisData;
  userImage: string;
  onSelectStyle: (styleName: string) => void;
  onReset: () => void;
}) {
  const generated = data.generatedStyles;

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-28 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Title Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight uppercase">Hair Analysis</h2>
          <p className="text-xs text-muted-foreground">การวิเคราะห์เส้นผม & ทรงผมที่เหมาะ</p>
        </div>
        <button
          onClick={onReset}
          className="text-primary flex items-center gap-1.5 text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-full"
        >
          <RefreshCw className="h-3 w-3" /> เริ่มใหม่
        </button>
      </div>

      {/* === SECTION 1: Face & Hair Analysis === */}
      <Card className="border-0 shadow-lg overflow-hidden bg-card">
        <div className="bg-muted/50 px-3 py-2 border-b">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
            Hair & Face Analysis / วิเคราะห์ใบหน้า & เส้นผม
          </p>
        </div>
        <CardContent className="p-0">
          <div className="flex">
            {/* User Photo */}
            <div className="relative w-[120px] shrink-0 aspect-[3/4]">
              <Image src={userImage} alt="User" fill className="object-cover" sizes="120px" />
            </div>
            {/* Stats Grid */}
            <div className="flex-1 grid grid-cols-2 gap-px bg-muted/30">
              {[
                { title: "Face Shape", subtitle: "รูปหน้า", value: data.faceShape, icon: "◇" },
                { title: "Hair Texture", subtitle: "ลักษณะเส้นผม", value: data.hairTexture, icon: "〰" },
                { title: "Hair Density", subtitle: "ความหนาแน่นผม", value: data.density, icon: "▐▌" },
                { title: "Overall Vibe", subtitle: "ลุคโดยรวม", value: data.vibe, icon: "✦" },
              ].map((stat, i) => (
                <div key={i} className="bg-card p-2.5 flex flex-col justify-center">
                  <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-[8px] text-muted-foreground/70">{stat.subtitle}</p>
                  <p className="text-xs font-bold mt-0.5 leading-tight">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === SECTION 2: Best Hairstyles === */}
      {generated?.best && generated.best.length > 0 && (
        <div>
          <SectionHeader
            icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
            title="Best Hairstyles / ทรงผมที่เหมาะ"
            subtitle="กดที่ภาพเพื่อลองทรงผมนี้"
            color="text-green-700 dark:text-green-400"
          />
          <div className="grid grid-cols-3 gap-2">
            {generated.best.map((style, i) => (
              <StyleCard
                key={i}
                style={style}
                onClick={() => onSelectStyle(style.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* === SECTION 3: Not Recommended === */}
      {generated?.notRecommended && generated.notRecommended.length > 0 && (
        <div>
          <SectionHeader
            icon={<XCircle className="h-5 w-5 text-red-500" />}
            title="Not Recommended / ทรงที่ไม่แนะนำ"
            subtitle="ทรงเหล่านี้อาจไม่เข้ากับโครงหน้าของคุณ"
            color="text-red-700 dark:text-red-400"
          />
          <div className="grid grid-cols-3 gap-2">
            {generated.notRecommended.map((style, i) => (
              <StyleCard key={i} style={style} grayscale />
            ))}
          </div>
        </div>
      )}

      {/* === SECTION 4: Hair Length === */}
      {generated?.length && generated.length.length > 0 && (
        <div>
          <SectionHeader
            icon={<Ruler className="h-5 w-5 text-blue-500" />}
            title="Hair Length / ความยาวผม"
            subtitle="ดูว่าความยาวไหนเหมาะกับคุณ"
          />
          <div className="grid grid-cols-3 gap-3">
            {generated.length.map((style, i) => (
              <StyleCard key={i} style={style} onClick={() => onSelectStyle(style.name)} />
            ))}
          </div>
        </div>
      )}

      {/* === SECTION 6: Hair Color === */}
      <div>
        <SectionHeader
          icon={<Palette className="h-5 w-5 text-amber-600" />}
          title="Hair Color / สีผมที่เหมาะ"
          subtitle="สีผมที่ช่วยขับผิวให้ดูดี"
        />
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            {/* Tone Analysis */}
            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Tone Analysis / โทนสีที่เหมาะ
              </p>
              <div className="flex gap-3">
                {["Cool", "Neutral", "Warm"].map((tone) => {
                  const isMatch = data.recommendedColors.some(
                    (c) => c.tone.toLowerCase() === tone.toLowerCase()
                  );
                  return (
                    <div key={tone} className="flex items-center gap-1.5">
                      <div
                        className={`w-6 h-6 rounded-full border-2 ${
                          isMatch ? "border-primary shadow-sm" : "border-muted opacity-40"
                        }`}
                        style={{
                          background:
                            tone === "Cool"
                              ? "linear-gradient(135deg, #8ea8c3, #b0c4de)"
                              : tone === "Neutral"
                                ? "linear-gradient(135deg, #c4b29a, #d4c5a9)"
                                : "linear-gradient(135deg, #c9956b, #dbb896)",
                        }}
                      />
                      <span className={`text-[10px] font-bold ${isMatch ? "" : "opacity-40"}`}>
                        {tone}
                        <br />
                        <span className="text-muted-foreground font-normal">
                          {tone === "Cool" ? "โทนเย็น" : tone === "Neutral" ? "โทนกลาง" : "โทนอุ่น"}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Color Swatches */}
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Color Examples / ตัวอย่างสีผม
            </p>
            <div className="flex gap-3 justify-center">
              {data.recommendedColors.map((color, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-10 h-10 rounded-full border-4 border-white shadow-md"
                    style={{ backgroundColor: color.hex }}
                  />
                  <p className="text-[9px] font-black uppercase text-center leading-tight">{color.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === SECTION 7: Suitability Scores === */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4 space-y-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            Compatibility / ความเข้ากันได้
          </p>
          {data.suitability.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span>{item.label}</span>
                <span className="text-primary">{item.value}%</span>
              </div>
              <Progress value={item.value} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sticky Reset Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t z-50">
        <div className="max-w-[480px] mx-auto">
          <Button
            className="w-full h-14 text-lg font-bold rounded-2xl"
            onClick={onReset}
          >
            <RefreshCw className="h-5 w-5 mr-2" /> ถ่ายรูปใหม่
          </Button>
        </div>
      </div>
    </div>
  );
}
