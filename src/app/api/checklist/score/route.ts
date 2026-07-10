// app/api/checklist/score/route.ts
// Sends the uploaded checkpoint photo to GPT-4o for an objective cleanliness
// score, so the report doesn't depend solely on what the field staff choose to write.

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

const SCORING_PROMPT = `You are a railway station sanitation auditor. Look at this photo of a station checkpoint (platform, toilet, waiting room, or water point).

Respond with ONLY valid JSON, no other text, in this exact shape:
{"score": <number 0-10, 10 = spotless>, "issues": ["short phrase", ...], "notes": "one sentence summary"}

Score strictly. Deduct heavily for: visible litter, stains, stagnant/standing water, overflowing bins, foul residue, broken fixtures. A merely "okay" area should score 5-6, not 8-9. If the photo doesn't clearly show a station checkpoint, set score to null and note why.`;

export async function POST(req: NextRequest) {
  try {
    const { submissionId, photoUrl } = await req.json();

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: SCORING_PROMPT },
              { type: "image_url", image_url: { url: photoUrl } },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    await sql`
      UPDATE submissions
      SET ai_score = ${parsed.score},
          ai_notes = ${JSON.stringify({ issues: parsed.issues, notes: parsed.notes })},
          ai_scored_at = now()
      WHERE id = ${submissionId}
    `;

    return NextResponse.json({ ok: true, score: parsed.score });
  } catch (err) {
    console.error("AI scoring failed:", err);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
