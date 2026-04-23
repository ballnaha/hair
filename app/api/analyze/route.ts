import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const prompt = `You are a professional hair and face analysis expert. 
Analyze this person's face from the image and provide a detailed analysis in JSON format.
Use short, professional English descriptions. I will translate them for the user.

The JSON must follow this exact structure:
{
  "faceShape": "Brief description",
  "hairTexture": "Brief description",
  "density": "Brief description",
  "vibe": "Style Vibe (e.g., Elegant, Bold, Natural)",
  "bestStyles": [
    {"name": "Style Name", "image": "https://images.unsplash.com/photo-1517832606299-7ae9b620a186?w=400&q=80"},
    {"name": "Style Name", "image": "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80"},
    {"name": "Style Name", "image": "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=400&q=80"}
  ],
  "notRecommended": [
    {"name": "Style Name", "image": "https://images.unsplash.com/photo-1622281561081-423f73da6a7e?w=400&q=80"},
    {"name": "Style Name", "image": "https://images.unsplash.com/photo-1599839619722-39751411ea63?w=400&q=80"}
  ],
  "recommendedColors": [
    {"name": "Color Name", "hex": "#4a3728", "tone": "Warm"},
    {"name": "Color Name", "hex": "#7a6a5d", "tone": "Neutral"},
    {"name": "Color Name", "hex": "#9b7e6b", "tone": "Soft"}
  ],
  "suitability": [
    {"label": "Recommended Length", "value": 85},
    {"label": "Face Compatibility", "value": 92},
    {"label": "Current Trend", "value": 78}
  ]
}
IMPORTANT: Only return the JSON object. No markdown, no preamble. Keep descriptions very short to avoid truncation.`;

    // Use a reliable Vision Model on fal.ai
    const result: any = await fal.subscribe("fal-ai/llava-next", {
      input: {
        prompt: prompt,
        image_url: image,
        max_tokens: 2048,
      },
      pollInterval: 500,
    });

    console.log("Analysis raw result:", JSON.stringify(result, null, 2));

    // Parse the JSON output from the AI
    let analysis;
    try {
      const outputText = result.output || result.data?.output || "";
      if (!outputText) {
        throw new Error("AI returned an empty output.");
      }
      
      const cleanJson = outputText.replace(/```json\n?|\n?```/g, "").trim();
      analysis = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e);
      throw new Error("AI returned invalid data format. Raw: " + JSON.stringify(result).substring(0, 500));
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("Analysis API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
