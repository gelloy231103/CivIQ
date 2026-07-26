import { describe, expect, it } from "vitest";
import {
  formatReviewerFileSize,
  isSupportedReviewerFileName,
  reviewerFileExtension,
  safeReviewerStorageName
} from "@/lib/reviewer-imports";

describe("reviewer imports", () => {
  it("recognizes currently supported source file types", () => {
    expect(isSupportedReviewerFileName("CSE 2026 Reviewer.PDF")).toBe(true);
    expect(isSupportedReviewerFileName("answer-sheet.docx")).toBe(true);
    expect(isSupportedReviewerFileName("scan.jpg")).toBe(false);
    expect(isSupportedReviewerFileName("legacy.chm")).toBe(false);
  });

  it("normalizes extensions and storage names", () => {
    expect(reviewerFileExtension("Reviewer Pack.PDF")).toBe(".pdf");
    expect(safeReviewerStorageName("CSE 2026 / Answers Sheet.pdf")).toBe("CSE-2026-Answers-Sheet.pdf");
  });

  it("formats file sizes for admin batch rows", () => {
    expect(formatReviewerFileSize(0)).toBe("0 B");
    expect(formatReviewerFileSize(1024)).toBe("1.0 KB");
    expect(formatReviewerFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
