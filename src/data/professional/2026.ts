import type { Question } from "@/lib/question-model";

const source =
  "reviewers/new/CSE 2026-2027 EXAMS AND ANSWERS SHEET-20260726T100724Z-1-001/CSE 2026-2027 EXAMS AND ANSWERS SHEET/Civil Service Exam Reviewer for 2026.pdf";

export const professional2026Questions: Question[] = [
  {
    id: "cse-pro-2026-math-001",
    examLevel: "professional",
    year: 2026,
    source,
    topic: "Numerical Reasoning",
    question:
      "If 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10 = 55, then 11 + 12 + 13 + 14 + 15 + 16 + 17 + 18 + 19 + 20 = ?",
    choices: [
      { id: "a", text: "65" },
      { id: "b", text: "155" },
      { id: "c", text: "125" },
      { id: "d", text: "550" }
    ],
    answer: "b",
    explanation: "Pair the terms from 11 to 20: there are 10 terms and their average is 15.5, so the sum is 155.",
    feedback: {
      correct: "Correct. The sequence 11 through 20 adds up to 155.",
      incorrect: "Use the average of the first and last term, then multiply by the number of terms."
    },
    status: "verified"
  },
  {
    id: "cse-pro-2026-math-003",
    examLevel: "professional",
    year: 2026,
    source,
    topic: "Numerical Reasoning",
    question: "Find the product: 800 x 125.",
    choices: [
      { id: "a", text: "925" },
      { id: "b", text: "1,000" },
      { id: "c", text: "10,000" },
      { id: "d", text: "100,000" }
    ],
    answer: "d",
    explanation: "Since 125 x 8 = 1,000, then 125 x 800 = 100,000.",
    feedback: {
      correct: "Correct. Scaling 125 x 8 by 100 gives 100,000.",
      incorrect: "Break 800 into 8 x 100, then multiply 125 x 8 first."
    },
    status: "verified"
  },
  {
    id: "cse-pro-2026-math-004",
    examLevel: "professional",
    year: 2026,
    source,
    topic: "Numerical Reasoning",
    question: "Find the quotient: 8,000 divided by 125.",
    choices: [
      { id: "a", text: "48" },
      { id: "b", text: "64" },
      { id: "c", text: "80" },
      { id: "d", text: "88" }
    ],
    answer: "b",
    explanation: "125 x 64 = 8,000, so 8,000 divided by 125 is 64.",
    feedback: {
      correct: "Correct. 125 multiplied by 64 returns 8,000.",
      incorrect: "Check which choice gives 8,000 when multiplied by 125."
    },
    status: "verified"
  },
  {
    id: "cse-pro-2026-math-008",
    examLevel: "professional",
    year: 2026,
    source,
    topic: "Numerical Reasoning",
    question: "Rounding 299,943 to the nearest thousands, the result is",
    choices: [
      { id: "a", text: "299,940" },
      { id: "b", text: "299,000" },
      { id: "c", text: "299,900" },
      { id: "d", text: "300,000" }
    ],
    answer: "d",
    explanation: "The hundreds digit is 9, so 299,943 rounds up to 300,000 at the nearest thousand.",
    feedback: {
      correct: "Correct. The number rounds up to 300,000.",
      incorrect: "Look at the hundreds digit when rounding to the nearest thousand."
    },
    status: "verified"
  },
  {
    id: "cse-pro-2026-math-018",
    examLevel: "professional",
    year: 2026,
    source,
    topic: "Numerical Reasoning",
    question: "What is 25% of 228?",
    choices: [
      { id: "a", text: "52" },
      { id: "b", text: "57" },
      { id: "c", text: "54" },
      { id: "d", text: "912" }
    ],
    answer: "b",
    explanation: "25% is one fourth. One fourth of 228 is 57.",
    feedback: {
      correct: "Correct. 228 divided by 4 is 57.",
      incorrect: "Convert 25% to one fourth, then divide 228 by 4."
    },
    status: "verified"
  }
];
