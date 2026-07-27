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
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const promptVersion = "civiq-v1";

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = await resolveGeminiApiKey(supabaseUrl, supabaseServiceRoleKey, process.env.GEMINI_API_KEY);
  const dailyLimit = positiveNumber(process.env.AI_EXPLANATION_DAILY_LIMIT, 10);
  const body = request.body;

  if (!body || !body.question || !body.answer || !body.builtInExplanation) {
    response.status(400).json({ error: "Missing question payload" });
    return;
  }

  const authorization = headerValue(request.headers?.authorization ?? request.headers?.Authorization);
  const userId = supabaseUrl && supabaseAnonKey && authorization
    ? await getSupabaseUserId(supabaseUrl, supabaseAnonKey, authorization)
    : null;

  if (!userId) {
    response.status(200).json({
      explanation: body.builtInExplanation,
      source: "fallback",
      remainingToday: 0
    });
    return;
  }

  const cacheStore = supabaseUrl && supabaseServiceRoleKey
    ? new SupabaseAiStore(supabaseUrl, supabaseServiceRoleKey)
    : null;
  const usageStore = cacheStore ?? (supabaseUrl && supabaseAnonKey && authorization
    ? new SupabaseUsageStore(supabaseUrl, supabaseAnonKey, authorization)
    : null);

  const cached = cacheStore ? await cacheStore.readCachedExplanation(body) : null;
  if (cached) {
    const remainingToday = usageStore ? await usageStore.remainingToday(userId, dailyLimit) : undefined;
    response.status(200).json({
      explanation: cached,
      source: "cache",
      remainingToday
    });
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
    const remainingBeforeCall = usageStore ? await usageStore.remainingToday(userId, dailyLimit) : dailyLimit;
    if (remainingBeforeCall <= 0) {
      response.status(200).json({
        explanation: body.builtInExplanation,
        source: "fallback",
        remainingToday: 0
      });
      return;
    }

    const explanation = await explainWithGemini(apiKey, body);
    if (usageStore && explanation) await usageStore.recordUsage(userId, dailyLimit);
    if (cacheStore && explanation) await cacheStore.cacheExplanation(body, explanation);
    const remainingToday = usageStore ? await usageStore.remainingToday(userId, dailyLimit) : undefined;

    response.status(200).json({
      explanation: explanation || body.builtInExplanation,
      source: explanation ? "provider" : "fallback",
      remainingToday
    });
  } catch {
    response.status(200).json({
      explanation: body.builtInExplanation,
      source: "fallback",
      remainingToday: usageStore ? await usageStore.remainingToday(userId, dailyLimit) : undefined
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

async function resolveGeminiApiKey(
  supabaseUrl: string | undefined,
  supabaseServiceRoleKey: string | undefined,
  fallbackApiKey: string | undefined
) {
  const vaultApiKey = await readVaultSecret(supabaseUrl, supabaseServiceRoleKey, "civiq_gemini_api_key");
  return vaultApiKey || fallbackApiKey;
}

async function readVaultSecret(
  supabaseUrl: string | undefined,
  supabaseServiceRoleKey: string | undefined,
  secretName: string
) {
  if (!supabaseUrl || !supabaseServiceRoleKey) return "";

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/civiq_vault_secret`, {
      method: "POST",
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ secret_name: secretName })
    });

    if (!response.ok) return "";

    const rows = (await response.json()) as Array<{ value?: unknown }>;
    const value = rows[0]?.value;
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

async function getSupabaseUserId(supabaseUrl: string, supabaseAnonKey: string, authorization: string) {
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authorization
      }
    });
    if (!response.ok) return null;
    const user = (await response.json()) as { id?: unknown };
    return typeof user.id === "string" ? user.id : null;
  } catch {
    return null;
  }
}

class SupabaseUsageStore {
  constructor(
    private readonly supabaseUrl: string,
    private readonly apiKey: string,
    private readonly authorization: string
  ) {}

  async remainingToday(userId: string, dailyLimit: number) {
    const requestCount = await this.usageCount(userId);
    return Math.max(0, dailyLimit - requestCount);
  }

  async recordUsage(userId: string, dailyLimit: number) {
    const usageDate = today();
    const currentCount = await this.usageCount(userId);
    const nextCount = Math.min(dailyLimit, currentCount + 1);
    await this.rest("ai_usage?on_conflict=user_id,usage_date", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        user_id: userId,
        usage_date: usageDate,
        request_count: nextCount
      })
    });
  }

  protected async usageCount(userId: string) {
    const filters = new URLSearchParams({
      user_id: `eq.${userId}`,
      usage_date: `eq.${today()}`,
      select: "request_count",
      limit: "1"
    });
    const response = await this.rest(`ai_usage?${filters.toString()}`);
    if (!response.ok) return 0;
    const rows = (await response.json()) as Array<{ request_count?: unknown }>;
    return Number(rows[0]?.request_count ?? 0);
  }

  protected rest(path: string, init: RequestInit = {}) {
    return fetch(`${this.supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.apiKey,
        Authorization: this.authorization,
        ...(init.headers ?? {})
      }
    });
  }
}

class SupabaseAiStore extends SupabaseUsageStore {
  constructor(supabaseUrl: string, serviceRoleKey: string) {
    super(supabaseUrl, serviceRoleKey, `Bearer ${serviceRoleKey}`);
  }

  async readCachedExplanation(body: ExplainRequest) {
    const filters = new URLSearchParams({
      question_id: `eq.${body.questionId}`,
      prompt_version: `eq.${promptVersion}`,
      select: "explanation",
      limit: "1"
    });
    if (body.selectedChoice) {
      filters.set("selected_choice", `eq.${body.selectedChoice}`);
    } else {
      filters.set("selected_choice", "is.null");
    }

    const response = await this.rest(`ai_explanations?${filters.toString()}`);
    if (!response.ok) return null;
    const rows = (await response.json()) as Array<{ explanation?: unknown }>;
    const explanation = rows[0]?.explanation;
    return typeof explanation === "string" && explanation.trim() ? explanation : null;
  }

  async cacheExplanation(body: ExplainRequest, explanation: string) {
    await this.rest("ai_explanations?on_conflict=question_id,selected_choice,prompt_version", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        question_id: body.questionId,
        selected_choice: body.selectedChoice ?? null,
        prompt_version: promptVersion,
        provider: "gemini",
        explanation
      })
    });
  }
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
