import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { explainWithGemini, type ExplainRequest } from "../../api/explain-question";

describe("explain question api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the built-in explanation when no signed-in user is provided", async () => {
    const response = createResponse();

    await handler({ method: "POST", body: payload() }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      explanation: "Legal means allowed by law.",
      source: "fallback",
      remainingToday: 0
    });
  });

  it("extracts provider text from Gemini responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: "Legal is correct because it means allowed by law." }]
            }
          }
        ]
      })))
    );

    await expect(explainWithGemini("test-key", payload())).resolves.toBe("Legal is correct because it means allowed by law.");
  });

  it("returns an empty provider result when Gemini rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 429 })));

    await expect(explainWithGemini("test-key", payload())).resolves.toBe("");
  });
});

function payload(): ExplainRequest {
  return {
    questionId: "test-question",
    question: "Which word means lawful?",
    choices: [
      { id: "A", text: "Legal" },
      { id: "B", text: "Late" }
    ],
    answer: "A",
    selectedChoice: "A",
    selectedChoiceText: "Legal",
    builtInExplanation: "Legal means allowed by law."
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    }
  };
}
