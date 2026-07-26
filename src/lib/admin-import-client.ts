import { supabase } from "@/lib/supabase";
import { REVIEWER_SOURCE_BUCKET, type ReviewerImportBatch, type ReviewerUploadTarget } from "@/lib/reviewer-imports";

export type AdminImportListResult = {
  batches: ReviewerImportBatch[];
  error?: string;
  denied?: boolean;
};

export type AdminCreateImportResult = {
  batch?: ReviewerImportBatch;
  uploadTargets: ReviewerUploadTarget[];
  error?: string;
  denied?: boolean;
};

export type AdminCompleteImportResult = {
  batch?: ReviewerImportBatch | null;
  error?: string;
  denied?: boolean;
};

export type AdminUploadFile = {
  clientId: string;
  file: File;
};

export async function listAdminImports(): Promise<AdminImportListResult> {
  const result = await adminFetch("/api/admin/imports");
  if (!result.ok) return { batches: [], error: result.error, denied: result.denied };
  return { batches: Array.isArray(result.data.batches) ? result.data.batches : [] };
}

export async function createAdminImportBatch({
  files,
  notes,
  title,
  year
}: {
  files: AdminUploadFile[];
  notes?: string;
  title?: string;
  year: number;
}): Promise<AdminCreateImportResult> {
  const result = await adminFetch("/api/admin/imports", {
    method: "POST",
    body: JSON.stringify({
      action: "create",
      year,
      title,
      notes,
      files: files.map(({ clientId, file }) => ({
        clientId,
        name: file.name,
        size: file.size,
        type: file.type
      }))
    })
  });

  if (!result.ok) return { uploadTargets: [], error: result.error, denied: result.denied };
  return {
    batch: result.data.batch,
    uploadTargets: Array.isArray(result.data.uploadTargets) ? result.data.uploadTargets : []
  };
}

export async function completeAdminImportBatch({
  batchId,
  failedFileIds,
  uploadedFileIds
}: {
  batchId: string;
  failedFileIds: string[];
  uploadedFileIds: string[];
}): Promise<AdminCompleteImportResult> {
  const result = await adminFetch("/api/admin/imports", {
    method: "POST",
    body: JSON.stringify({
      action: "complete",
      batchId,
      failedFileIds,
      uploadedFileIds
    })
  });

  if (!result.ok) return { error: result.error, denied: result.denied };
  return { batch: result.data.batch };
}

export async function uploadReviewerSourceToSignedUrl(target: ReviewerUploadTarget, file: File) {
  if (!supabase) return "Storage is not connected yet.";
  const { error } = await supabase.storage.from(REVIEWER_SOURCE_BUCKET).uploadToSignedUrl(target.path, target.token, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  return error?.message ?? null;
}

async function adminFetch(path: string, init: RequestInit = {}) {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  if (!token) {
    return { ok: false, denied: true, error: "Sign in with the admin account to continue.", data: {} as Record<string, unknown> };
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      denied: response.status === 401 || response.status === 403,
      error: typeof data.error === "string" ? data.error : "The admin request failed.",
      data
    };
  }

  return { ok: true, denied: false, error: undefined, data };
}
