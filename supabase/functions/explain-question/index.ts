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

  // Provider calls should run only after Supabase service-role cache and quota checks.
  // This stub intentionally keeps browser code away from provider keys.
  return json({
    explanation: body.builtInExplanation,
    source: "fallback",
    remainingToday: Number(Deno.env.get("AI_EXPLANATION_DAILY_LIMIT") ?? 10)
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
