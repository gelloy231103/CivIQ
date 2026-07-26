import type { Question } from "@/lib/question-model";
import { getChoice } from "@/lib/question-model";

export type AiExplanationResult = {
  explanation: string;
  source: "cache" | "provider" | "fallback";
  remainingToday?: number;
};

export async function requestAiExplanation(question: Question, selectedChoice?: string): Promise<AiExplanationResult> {
  const choice = selectedChoice ? getChoice(question, selectedChoice) : undefined;
  try {
    const response = await fetch("/api/explain-question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        questionId: question.id,
        question: question.question,
        choices: question.choices,
        answer: question.answer,
        selectedChoice,
        selectedChoiceText: choice?.text,
        builtInExplanation: question.explanation
      })
    });

    if (!response.ok) {
      return {
        explanation: question.explanation,
        source: "fallback"
      };
    }

    const result = (await response.json()) as Partial<AiExplanationResult>;
    if (typeof result.explanation === "string" && result.explanation.trim()) {
      return {
        explanation: result.explanation,
        source: result.source ?? "provider",
        remainingToday: result.remainingToday
      };
    }
  } catch {
    return {
      explanation: question.explanation,
      source: "fallback"
    };
  }

  return {
    explanation: question.explanation,
    source: "fallback"
  };
}
