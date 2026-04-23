import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function POST(request: Request) {
  try {
    const { image, style, color } = await request.json();

    if (!image || !style) {
      return NextResponse.json(
        { error: "Image and style are required" },
        { status: 400 }
      );
    }

    // Call fal.ai image-apps-v2/hair-change API
    const result: any = await fal.subscribe("fal-ai/image-apps-v2/hair-change", {
      input: {
        image_url: image,
        target_hairstyle: style,
        hair_color: color || "natural",
      },
      logs: true,
      pollInterval: 500,
    });

    console.log("Fal.ai Result:", JSON.stringify(result, null, 2));

    // Extract the image URL from the response
    const imageUrl = result?.data?.images?.[0]?.url
      || result?.images?.[0]?.url
      || result?.data?.image?.url
      || result?.image?.url
      || result?.url;

    if (!imageUrl) {
      throw new Error("Unexpected fal.ai response format or missing image URL.");
    }

    return NextResponse.json({ result: imageUrl });
  } catch (error: any) {
    console.error("Fal.ai API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transform image" },
      { status: 500 }
    );
  }
}
