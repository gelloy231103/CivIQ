import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type ExplainRequest = {
  questionId: string;
  question: string;
  choices: Array<{ id: string; text: string }>;
  answer: string;
  selectedChoice?: string;
  selectedChoiceText?: string;
  builtInExplanation: string;
};

serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const body = (await request.json()) as ExplainRequest;
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return json({
      explanation: body.builtInExplanation,
      source: "fallback",
      remainingToday: 0
    });
  }

  try {
    const explanation = await explainWithGemini(apiKey, body);
    return json({
      explanation: explanation || body.builtInExplanation,
      source: explanation ? "provider" : "fallback",
      remainingToday: Number(Deno.env.get("AI_EXPLANATION_DAILY_LIMIT") ?? 10)
    });
  } catch {
    return json({
      explanation: body.builtInExplanation,
      source: "fallback",
      remainingToday: Number(Deno.env.get("AI_EXPLANATION_DAILY_LIMIT") ?? 10)
    });
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function explainWithGemini(apiKey: string, body: ExplainRequest) {
  const prompt = [
    "You are helping a Philippine Civil Service Exam Professional reviewer app.",
    "Explain the answer clearly in 2-4 short sentences.",
    "Do not change the official answer. If the user chose incorrectly, explain why the correct answer is better.",
    "",
    `Question ID: ${body.questionId}`,
    `Question: ${body.question}`,
    `Choices: ${body.choices.map((choice) => `${choice.id}. ${choice.text}`).join(" | ")}`,
    `Official answer: ${body.answer}`,
    body.selectedChoice ? `User selected: ${body.selectedChoice}. ${body.selectedChoiceText ?? ""}` : "User selected: not provided",
    `Built-in explanation: ${body.builtInExplanation}`
  ].join("\n");

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 220
        }
      })
    }
  );

  if (!geminiResponse.ok) {
    return "";
  }

  const data = (await geminiResponse.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}
