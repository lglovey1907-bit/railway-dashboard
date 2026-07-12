import { NextResponse, NextRequest } from "next/server";
import { sql } from "@vercel/postgres";

export const maxDuration = 60; // Allow 60s for OpenAI

export async function POST(req: NextRequest) {
  try {
    const { feedbackId, photoUrl, rating } = await req.json();

    if (!feedbackId || !photoUrl || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Analyze with OpenAI
    // We want to know if the image is actually dirty (for low ratings) or actually clean (for high ratings)
    const prompt = `
      You are verifying a passenger's cleanliness rating for a railway station.
      The passenger gave a rating of ${rating} out of 5 stars (1 is very dirty, 5 is spotless).
      
      Look at this photo provided by the passenger.
      Does the visual evidence in the photo roughly match a rating of ${rating}?
      If the passenger gave a 1 or 2, is there actually dirt, garbage, stains, or a mess visible?
      If the passenger gave a 4 or 5, does the area look generally clean?
      
      Respond with ONLY a JSON object exactly like this:
      {
        "verified": true or false,
        "notes": "Brief explanation of what you see and why it matches or contradicts the rating"
      }
    `;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: photoUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 150,
      }),
    });

    const data = await openaiResponse.json();
    const aiText = data.choices?.[0]?.message?.content || "{}";
    let aiVerified = false;
    let aiNotes = {};

    try {
      const parsed = JSON.parse(aiText);
      aiVerified = parsed.verified === true;
      aiNotes = parsed;
    } catch (e) {
      console.error("Failed to parse AI response", e);
    }

    // 2. Update Database
    await sql`
      UPDATE passenger_feedback
      SET ai_verified = ${aiVerified}, ai_notes = ${JSON.stringify(aiNotes)}::jsonb
      WHERE id = ${feedbackId}
    `;

    return NextResponse.json({ ok: true, verified: aiVerified });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
