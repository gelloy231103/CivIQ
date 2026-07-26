export type HeaderMap = Record<string, string | string[] | undefined>;

export type AdminAuthSuccess = {
  ok: true;
  user: {
    id: string;
    email: string;
  };
};

export type AdminAuthFailure = {
  ok: false;
  status: 401 | 403 | 500;
  error: string;
};

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

type AdminEnv = {
  ADMIN_EMAILS?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

export async function authenticateAdmin(headers: HeaderMap | undefined, env: AdminEnv = process.env): Promise<AdminAuthResult> {
  const authorization = getHeader(headers, "authorization");
  const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY;

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Sign in to continue." };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: "Supabase auth is not configured." };
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: authorization
      }
    });

    if (!response.ok) {
      return { ok: false, status: 401, error: "Your session could not be verified." };
    }

    const user = (await response.json()) as { id?: unknown; email?: unknown };
    const id = typeof user.id === "string" ? user.id : "";
    const email = typeof user.email === "string" ? user.email : "";

    if (!id || !email) {
      return { ok: false, status: 401, error: "Your account details could not be verified." };
    }

    if (!isAllowedAdminEmail(email, env.ADMIN_EMAILS)) {
      return { ok: false, status: 403, error: "This admin workspace is not available for your account." };
    }

    return { ok: true, user: { id, email: email.toLowerCase() } };
  } catch {
    return { ok: false, status: 401, error: "Your session could not be verified." };
  }
}

export function isAllowedAdminEmail(email: string | undefined, allowlist: string | undefined) {
  if (!email || !allowlist) return false;
  const normalized = email.trim().toLowerCase();
  return parseAdminEmails(allowlist).has(normalized);
}

export function parseAdminEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(/[,;\s]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getHeader(headers: HeaderMap | undefined, name: string) {
  const lowerName = name.toLowerCase();
  const direct = headers?.[lowerName] ?? headers?.[name];
  if (direct) return headerValue(direct);

  const match = Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === lowerName);
  return match ? headerValue(match[1]) : undefined;
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
