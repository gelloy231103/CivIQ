type Choice = {
  id: string;
  text: string;
};

export type ExplainRequest = {
  questionId: string;
  question: string;
  choices: Choice[];
  answer: string;
  selectedChoice?: string;
  selectedChoiceText?: string;
  builtInExplanation: string;
};

type VercelRequest = {
  method?: string;
  body?: ExplainRequest;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const body = request.body;

  if (!body || !body.question || !body.answer || !body.builtInExplanation) {
    response.status(400).json({ error: "Missing question payload" });
    return;
  }

  if (!apiKey) {
    response.status(200).json({
      explanation: body.builtInExplanation,
      source: "fallback",
      remainingToday: 0
    });
    return;
  }

  try {
    const explanation = await explainWithGemini(apiKey, body);
    response.status(200).json({
      explanation: explanation || body.builtInExplanation,
      source: explanation ? "provider" : "fallback"
    });
  } catch {
    response.status(200).json({
      explanation: body.builtInExplanation,
      source: "fallback"
    });
  }
}

export async function explainWithGemini(apiKey: string, body: ExplainRequest) {
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
