import { createClient } from "@supabase/supabase-js";
import { authenticateAdmin, type HeaderMap } from "../_lib/admin-auth.js";
import {
  isSupportedReviewerFileName,
  reviewerFileExtension,
  REVIEWER_SOURCE_BUCKET,
  safeReviewerStorageName,
  type ReviewerImportBatch,
  type ReviewerImportBatchStatus,
  type ReviewerImportFile,
  type ReviewerImportFileStatus,
  type ReviewerUploadTarget
} from "../../src/lib/reviewer-imports.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers?: HeaderMap;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type IncomingFile = {
  clientId?: string;
  name?: string;
  size?: number;
  type?: string;
};

type CreateImportBody = {
  action?: "create";
  year?: number;
  title?: string;
  notes?: string;
  files?: IncomingFile[];
};

type CompleteImportBody = {
  action?: "complete";
  batchId?: string;
  uploadedFileIds?: string[];
  failedFileIds?: string[];
};

type ImportBatchRow = {
  id: string;
  year: number;
  title: string;
  status: ReviewerImportBatchStatus;
  file_count: number;
  supported_count: number;
  unsupported_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ImportFileRow = {
  id: string;
  batch_id: string;
  original_name: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number;
  extension: string;
  supported: boolean;
  status: ReviewerImportFileStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseAdminClient = ReturnType<typeof createClient<any, "public", any>>;

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "no-store");

  const auth = await authenticateAdmin(request.headers);
  if (auth.ok !== true) {
    response.status(auth.status).json({ error: auth.error });
    return;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    response.status(500).json({ error: "Admin storage is not configured." });
    return;
  }

  if (request.method === "GET") {
    const batches = await listImportBatches(admin);
    response.status(200).json({ batches });
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = parseBody<CreateImportBody | CompleteImportBody>(request.body);
  if (body?.action === "complete") {
    const result = await completeImportBatch(admin, body);
    response.status(result.status).json(result.body);
    return;
  }

  const result = await createImportBatch(admin, auth.user.id, body as CreateImportBody | null);
  response.status(result.status).json(result.body);
}

function createSupabaseAdmin(): SupabaseAdminClient | null {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient<any, "public", any>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function createImportBatch(admin: SupabaseAdminClient, userId: string, body: CreateImportBody | null) {
  const files = normalizeIncomingFiles(body?.files);
  const year = Number(body?.year);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return jsonResult(400, { error: "Choose a valid reviewer year." });
  }

  if (files.length === 0) {
    return jsonResult(400, { error: "Choose at least one source file." });
  }

  const title = (body?.title?.trim() || `${year} reviewer source upload`).slice(0, 120);
  const notes = body?.notes?.trim().slice(0, 500) || null;
  const supportedCount = files.filter((file) => file.supported).length;
  const unsupportedCount = files.length - supportedCount;
  const initialStatus: ReviewerImportBatchStatus = supportedCount > 0 ? "uploading" : "failed";

  await ensureReviewerBucket(admin);

  const { data: batch, error: batchError } = await admin
    .from("reviewer_import_batches")
    .insert({
      created_by: userId,
      year,
      title,
      notes,
      status: initialStatus,
      file_count: files.length,
      supported_count: supportedCount,
      unsupported_count: unsupportedCount
    })
    .select("id, year, title, status, file_count, supported_count, unsupported_count, notes, created_at, updated_at")
    .single();

  if (batchError || !batch) {
    return jsonResult(500, { error: "Could not create the import batch." });
  }

  const batchRow = batch as ImportBatchRow;
  const preparedFiles = files.map((file, index) => ({
    ...file,
    storagePath: file.supported ? `${year}/${batchRow.id}/${String(index + 1).padStart(3, "0")}-${safeReviewerStorageName(file.name)}` : null
  }));
  const fileRows = preparedFiles.map((file) => ({
    batch_id: batchRow.id,
    original_name: file.name,
    storage_path: file.storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
    extension: file.extension,
    supported: file.supported,
    status: file.supported ? "pending_upload" : "unsupported",
    error_message: file.supported ? null : "This file type is not supported yet."
  }));

  const { data: insertedFiles, error: filesError } = await admin
    .from("reviewer_import_files")
    .insert(fileRows)
    .select("id, batch_id, original_name, storage_path, mime_type, size_bytes, extension, supported, status, error_message, created_at, updated_at");

  if (filesError || !insertedFiles) {
    return jsonResult(500, { error: "Could not register the source files." });
  }

  const uploadTargets: ReviewerUploadTarget[] = [];
  for (const file of insertedFiles as ImportFileRow[]) {
    if (!file.supported || !file.storage_path) continue;
    const { data, error } = await admin.storage.from(REVIEWER_SOURCE_BUCKET).createSignedUploadUrl(file.storage_path);
    if (error || !data?.token) {
      await admin
        .from("reviewer_import_files")
        .update({ status: "failed", error_message: "Could not create upload token.", updated_at: new Date().toISOString() })
        .eq("id", file.id);
      continue;
    }

    const original = preparedFiles.find((item) => item.storagePath === file.storage_path);
    uploadTargets.push({
      fileId: file.id,
      clientId: original?.clientId ?? file.original_name,
      path: data.path ?? file.storage_path,
      token: data.token
    });
  }

  return jsonResult(200, {
    batch: mapBatch(batchRow, insertedFiles as ImportFileRow[]),
    uploadTargets
  });
}

async function completeImportBatch(admin: SupabaseAdminClient, body: CompleteImportBody) {
  const batchId = body.batchId;
  if (!batchId) return jsonResult(400, { error: "Missing import batch." });

  const uploadedFileIds = uniqueIds(body.uploadedFileIds);
  const failedFileIds = uniqueIds(body.failedFileIds);
  const now = new Date().toISOString();

  if (uploadedFileIds.length > 0) {
    await admin
      .from("reviewer_import_files")
      .update({ status: "uploaded", error_message: null, updated_at: now })
      .eq("batch_id", batchId)
      .in("id", uploadedFileIds);
  }

  if (failedFileIds.length > 0) {
    await admin
      .from("reviewer_import_files")
      .update({ status: "failed", error_message: "Upload failed in the browser.", updated_at: now })
      .eq("batch_id", batchId)
      .in("id", failedFileIds);
  }

  const { data: files } = await admin
    .from("reviewer_import_files")
    .select("id, status, supported")
    .eq("batch_id", batchId);

  const supportedFiles = files?.filter((file) => file.supported) ?? [];
  const uploadedCount = supportedFiles.filter((file) => file.status === "uploaded").length;
  const failedCount = supportedFiles.filter((file) => file.status === "failed").length;
  const batchStatus: ReviewerImportBatchStatus = uploadedCount > 0 && failedCount === 0 ? "uploaded" : "failed";

  const { error } = await admin
    .from("reviewer_import_batches")
    .update({ status: batchStatus, updated_at: now })
    .eq("id", batchId);

  if (error) return jsonResult(500, { error: "Could not finalize the import batch." });
  return jsonResult(200, { batch: await readImportBatch(admin, batchId) });
}

async function listImportBatches(admin: SupabaseAdminClient) {
  const { data: batches, error } = await admin
    .from("reviewer_import_batches")
    .select("id, year, title, status, file_count, supported_count, unsupported_count, notes, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !batches?.length) return [];

  const ids = batches.map((batch) => String(batch.id));
  const { data: files } = await admin
    .from("reviewer_import_files")
    .select("id, batch_id, original_name, storage_path, mime_type, size_bytes, extension, supported, status, error_message, created_at, updated_at")
    .in("batch_id", ids)
    .order("created_at", { ascending: true });

  const filesByBatch = groupFiles(files as ImportFileRow[] | null);
  return (batches as ImportBatchRow[]).map((batch) => mapBatch(batch, filesByBatch.get(batch.id) ?? []));
}

async function readImportBatch(admin: SupabaseAdminClient, batchId: string) {
  const { data: batch } = await admin
    .from("reviewer_import_batches")
    .select("id, year, title, status, file_count, supported_count, unsupported_count, notes, created_at, updated_at")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch) return null;

  const { data: files } = await admin
    .from("reviewer_import_files")
    .select("id, batch_id, original_name, storage_path, mime_type, size_bytes, extension, supported, status, error_message, created_at, updated_at")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });

  return mapBatch(batch as ImportBatchRow, (files ?? []) as ImportFileRow[]);
}

async function ensureReviewerBucket(admin: SupabaseAdminClient) {
  const { error } = await admin.storage.getBucket(REVIEWER_SOURCE_BUCKET);
  if (!error) return;
  await admin.storage.createBucket(REVIEWER_SOURCE_BUCKET, { public: false });
}

function normalizeIncomingFiles(files: IncomingFile[] | undefined) {
  return (files ?? [])
    .map((file, index) => {
      const name = file.name?.trim() ?? "";
      const size = Number(file.size ?? 0);
      const extension = reviewerFileExtension(name);
      return {
        clientId: file.clientId || `${index}`,
        name,
        size: Number.isFinite(size) && size > 0 ? Math.round(size) : 0,
        type: file.type?.trim() ?? "",
        extension,
        supported: Boolean(name) && isSupportedReviewerFileName(name)
      };
    })
    .filter((file) => file.name);
}

function groupFiles(files: ImportFileRow[] | null) {
  const groups = new Map<string, ImportFileRow[]>();
  for (const file of files ?? []) {
    groups.set(file.batch_id, [...(groups.get(file.batch_id) ?? []), file]);
  }
  return groups;
}

function mapBatch(batch: ImportBatchRow, files: ImportFileRow[]): ReviewerImportBatch {
  return {
    id: batch.id,
    year: batch.year,
    title: batch.title,
    status: batch.status,
    fileCount: Number(batch.file_count ?? 0),
    supportedCount: Number(batch.supported_count ?? 0),
    unsupportedCount: Number(batch.unsupported_count ?? 0),
    notes: batch.notes ?? undefined,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
    files: files.map(mapFile)
  };
}

function mapFile(file: ImportFileRow): ReviewerImportFile {
  return {
    id: file.id,
    batchId: file.batch_id,
    originalName: file.original_name,
    storagePath: file.storage_path ?? undefined,
    mimeType: file.mime_type ?? undefined,
    sizeBytes: Number(file.size_bytes ?? 0),
    extension: file.extension,
    supported: file.supported,
    status: file.status,
    errorMessage: file.error_message ?? undefined,
    createdAt: file.created_at,
    updatedAt: file.updated_at
  };
}

function uniqueIds(values: string[] | undefined) {
  return [...new Set((values ?? []).filter((value) => typeof value === "string" && value.length > 0))];
}

function parseBody<T>(body: unknown): T | null {
  if (!body) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as T;
    } catch {
      return null;
    }
  }
  return body as T;
}

function jsonResult(status: number, body: unknown) {
  return { status, body };
}
