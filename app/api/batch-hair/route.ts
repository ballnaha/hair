import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

// Male Styles
const MALE_STYLES = [
  { name: "Side Part", style: "side_part", label: "แสกข้างเนี้ยบ", group: "best" },
  { name: "Middle Part", style: "middle_part", label: "แสกกลางเกาหลี", group: "best" },
  { name: "Curly Hair", style: "curly_hair", label: "ดัดลอนวอลุ่ม", group: "best" },
  { name: "Buzz Cut", style: "buzz_cut", label: "สั้นเกรียนเท่ๆ", group: "notRecommended" },
  { name: "Mohawk", style: "mohawk", label: "โมฮ็อกสายลุย", group: "notRecommended" },
  { name: "Short Hair", style: "short_hair", label: "สั้นมาตรฐาน", group: "length" },
];

// Female Styles
const FEMALE_STYLES = [
  { name: "Long Wavy", style: "wavy_hair", label: "ลอนยาวพริ้ว", group: "best" },
  { name: "Bob Cut", style: "bob_cut", label: "บ็อบสั้นมั่นใจ", group: "best" },
  { name: "Bangs", style: "bangs", label: "หน้าม้าซีทรู", group: "best" },
  { name: "Pixie Cut", style: "pixie_cut", label: "พิกซี่เปรี้ยวๆ", group: "notRecommended" },
  { name: "Buzz Cut", style: "buzz_cut", label: "สกินเฮด (ไม่แนะนำ)", group: "notRecommended" },
  { name: "High Ponytail", style: "high_ponytail", label: "มัดรวบตึง", group: "length" },
];

export async function POST(request: Request) {
  try {
    const { image, gender } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Select styles based on gender (default to female if not specified)
    const stylesToUse = gender === "male" ? MALE_STYLES : FEMALE_STYLES;

    console.log(`Starting batch hair generation for ${gender}: ${stylesToUse.length} jobs...`);
    const startTime = Date.now();

    // Run all API calls in parallel for max speed
    const results = await Promise.allSettled(
      stylesToUse.map(async (job) => {
        try {
          const result: any = await fal.subscribe("fal-ai/image-apps-v2/hair-change", {
            input: {
              image_url: image,
              target_hairstyle: job.style,
              hair_color: "natural",
            } as any,
            pollInterval: 500,
          });

          const imageUrl =
            result?.data?.images?.[0]?.url ||
            result?.images?.[0]?.url ||
            result?.data?.image?.url ||
            result?.image?.url ||
            result?.url;

          return {
            name: job.name,
            label: job.label,
            group: job.group,
            style: job.style,
            image: imageUrl || null,
          };
        } catch (err: any) {
          console.error(`Failed: ${job.name}:`, err.message);
          return {
            name: job.name,
            label: job.label,
            group: job.group,
            style: job.style,
            image: null,
          };
        }
      })
    );

    // Organize results into groups
    const organized: Record<string, any[]> = {
      best: [],
      notRecommended: [],
      length: [],
    };

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) {
        organized[r.value.group].push(r.value);
      }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Batch generation complete in ${elapsed}s`);
    return NextResponse.json(organized);
  } catch (error: any) {
    console.error("Batch API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate hairstyles" },
      { status: 500 }
    );
  }
}
