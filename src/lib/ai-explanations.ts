import type { Question } from "@/lib/question-model";
import { getChoice } from "@/lib/question-model";

export type AiExplanationResult = {
  explanation: string;
  source: "cache" | "provider" | "fallback";
  remainingToday?: number;
};

export async function requestAiExplanation(question: Question, selectedChoice?: string): Promise<AiExplanationResult> {
  const choice = selectedChoice ? getChoice(question, selectedChoice) : undefined;
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
  }).catch(() => null);

  if (!response?.ok) {
    return {
      explanation: question.explanation,
      source: "fallback"
    };
  }

  return (await response.json()) as AiExplanationResult;
}
