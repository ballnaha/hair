export interface HairColorRecommendation {
  name: string;
  hex: string;
  tone: string;
}

export const MAX_HAIRSTYLE_PREVIEW_COUNT = 1;
export const MAX_HAIR_COLOR_PREVIEW_COUNT = 1;
export const MAX_UPLOAD_DIMENSION = 768; // Optimized for speed while keeping quality
export const UPLOAD_IMAGE_QUALITY = 0.75; // Balanced for faster upload

const DEFAULT_HAIR_COLOR_RECOMMENDATIONS: HairColorRecommendation[] = [
  { name: "Black", hex: "#1b1b1b", tone: "Cool" },
  { name: "Dark Brown", hex: "#4a3728", tone: "Warm" },
  { name: "Light Brown", hex: "#8b6b4a", tone: "Neutral" },
  { name: "Auburn", hex: "#7a3f2b", tone: "Warm" },
  { name: "Blonde", hex: "#c9a86a", tone: "Soft" },
];

export const ALL_HAIR_COLOR_RECOMMENDATIONS = DEFAULT_HAIR_COLOR_RECOMMENDATIONS;

export const DEFAULT_RECOMMENDED_COLORS = DEFAULT_HAIR_COLOR_RECOMMENDATIONS.slice(
  0,
  MAX_HAIR_COLOR_PREVIEW_COUNT
);