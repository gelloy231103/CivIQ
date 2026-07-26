export const REVIEWER_SOURCE_BUCKET = "reviewer-sources";

export const SUPPORTED_REVIEWER_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"] as const;

export type ReviewerImportFileStatus = "pending_upload" | "uploaded" | "unsupported" | "failed";

export type ReviewerImportBatchStatus = "uploading" | "uploaded" | "failed" | "processing" | "ready_for_review";

export type ReviewerImportFile = {
  id: string;
  batchId: string;
  originalName: string;
  storagePath?: string;
  mimeType?: string;
  sizeBytes: number;
  extension: string;
  supported: boolean;
  status: ReviewerImportFileStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewerImportBatch = {
  id: string;
  year: number;
  title: string;
  status: ReviewerImportBatchStatus;
  fileCount: number;
  supportedCount: number;
  unsupportedCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  files: ReviewerImportFile[];
};

export type ReviewerUploadTarget = {
  fileId: string;
  clientId: string;
  path: string;
  token: string;
};

export function reviewerFileExtension(fileName: string) {
  const cleanName = fileName.trim().toLowerCase();
  const dotIndex = cleanName.lastIndexOf(".");
  return dotIndex > -1 ? cleanName.slice(dotIndex) : "";
}

export function isSupportedReviewerFileName(fileName: string) {
  const extension = reviewerFileExtension(fileName);
  return SUPPORTED_REVIEWER_EXTENSIONS.includes(extension as (typeof SUPPORTED_REVIEWER_EXTENSIONS)[number]);
}

export function safeReviewerStorageName(fileName: string, fallback = "reviewer-source") {
  const trimmed = fileName.trim();
  const extension = reviewerFileExtension(trimmed);
  const baseName = extension ? trimmed.slice(0, -extension.length) : trimmed;
  const safeBase = baseName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeBase || fallback}${extension}`;
}

export function formatReviewerFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}
