import { AlertTriangle, CheckCircle2, FileText, FolderLock, RefreshCcw, ShieldCheck, UploadCloud, XCircle } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  completeAdminImportBatch,
  createAdminImportBatch,
  listAdminImports,
  uploadReviewerSourceToSignedUrl,
  type AdminUploadFile
} from "@/lib/admin-import-client";
import {
  formatReviewerFileSize,
  isSupportedReviewerFileName,
  type ReviewerImportBatch
} from "@/lib/reviewer-imports";

type UploadState = {
  active: boolean;
  uploaded: number;
  total: number;
  message: string;
};

export function AdminImportsPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  const [batches, setBatches] = useState<ReviewerImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(2026);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<AdminUploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ active: false, uploaded: 0, total: 0, message: "" });
  const supportedFiles = useMemo(() => files.filter(({ file }) => isSupportedReviewerFileName(file.name)), [files]);
  const unsupportedFiles = files.length - supportedFiles.length;

  useEffect(() => {
    refreshBatches();
  }, []);

  async function refreshBatches() {
    setLoading(true);
    const result = await listAdminImports();
    setLoading(false);
    setAccessDenied(Boolean(result.denied));
    if (result.error && !result.denied) setError(result.error);
    setBatches(result.batches);
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).map((file, index) => ({
      clientId: `${Date.now()}-${index}-${file.name}`,
      file
    }));
    setFiles(selected);
    setError(null);
    setNotice(null);
  }

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (files.length === 0) {
      setError("Choose at least one reviewer source file.");
      return;
    }

    if (supportedFiles.length === 0) {
      setError("Choose at least one supported file: PDF, DOCX, TXT, or MD.");
      return;
    }

    setUploadState({ active: true, uploaded: 0, total: supportedFiles.length, message: "Creating private upload links" });
    const createResult = await createAdminImportBatch({ files, notes, title, year });
    if (createResult.error || !createResult.batch) {
      setAccessDenied(Boolean(createResult.denied));
      setError(createResult.error ?? "Could not create the import batch.");
      setUploadState({ active: false, uploaded: 0, total: 0, message: "" });
      return;
    }

    const targetByClientId = new Map(createResult.uploadTargets.map((target) => [target.clientId, target]));
    const uploadedFileIds: string[] = [];
    const failedFileIds: string[] = [];

    for (const uploadFile of supportedFiles) {
      const target = targetByClientId.get(uploadFile.clientId);
      if (!target) continue;
      setUploadState((current) => ({ ...current, message: `Uploading ${uploadFile.file.name}` }));
      const uploadError = await uploadReviewerSourceToSignedUrl(target, uploadFile.file);
      if (uploadError) {
        failedFileIds.push(target.fileId);
      } else {
        uploadedFileIds.push(target.fileId);
        setUploadState((current) => ({ ...current, uploaded: current.uploaded + 1 }));
      }
    }

    const completeResult = await completeAdminImportBatch({
      batchId: createResult.batch.id,
      uploadedFileIds,
      failedFileIds
    });

    if (completeResult.error) {
      setError(completeResult.error);
    } else {
      setNotice(
        failedFileIds.length > 0
          ? "Import batch saved, but some files failed to upload."
          : "Import batch uploaded and staged for extraction."
      );
      setFiles([]);
      setTitle("");
      setNotes("");
    }

    setUploadState({ active: false, uploaded: 0, total: 0, message: "" });
    await refreshBatches();
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <ShieldCheck aria-hidden="true" />
            </div>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>Sign in with the approved admin account to upload reviewer source files.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FolderLock aria-hidden="true" />
            </div>
            <CardTitle className="text-3xl leading-tight">Reviewer source imports</CardTitle>
            <CardDescription>Upload source reviewers into a private staging area before extraction and verification.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submitImport}>
              <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
                <Field label="Year" htmlFor="admin-import-year">
                  <Input
                    id="admin-import-year"
                    min={2000}
                    max={2100}
                    type="number"
                    value={year}
                    onChange={(event) => setYear(Number(event.target.value))}
                    required
                  />
                </Field>
                <Field label="Batch title" htmlFor="admin-import-title">
                  <Input
                    id="admin-import-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={`${year} reviewer source upload`}
                  />
                </Field>
              </div>

              <Field label="Notes" htmlFor="admin-import-notes">
                <textarea
                  id="admin-import-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground md:text-sm"
                  placeholder="Optional internal note"
                />
              </Field>

              <Field label="Source files" htmlFor="admin-import-files">
                <Input
                  id="admin-import-files"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.md,.doc,.chm,.djvu,.jpg,.jpeg,.png"
                  onChange={selectFiles}
                />
              </Field>

              {files.length > 0 ? (
                <div className="rounded-md border bg-muted/40 p-3">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge variant="gold">{supportedFiles.length} supported</Badge>
                    {unsupportedFiles > 0 ? <Badge variant="destructive">{unsupportedFiles} unsupported</Badge> : null}
                  </div>
                  <div className="grid gap-2">
                    {files.map(({ clientId, file }) => (
                      <FilePreview key={clientId} file={file} />
                    ))}
                  </div>
                </div>
              ) : null}

              {uploadState.active ? (
                <div className="rounded-md border bg-primary/5 p-3">
                  <p className="text-sm font-bold">{uploadState.message}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {uploadState.uploaded} of {uploadState.total} files uploaded
                  </p>
                  <Progress className="mt-3" value={uploadState.total > 0 ? (uploadState.uploaded / uploadState.total) * 100 : 0} />
                </div>
              ) : null}

              {error ? <Status tone="error">{error}</Status> : null}
              {notice ? <Status tone="success">{notice}</Status> : null}

              <Button type="submit" disabled={uploadState.active}>
                <UploadCloud aria-hidden="true" />
                {uploadState.active ? "Uploading" : "Upload to staging"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staging rules</CardTitle>
            <CardDescription>Uploads stay private until questions are extracted and verified.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm font-semibold leading-6 text-muted-foreground">
            <p>Supported now: PDF, DOCX, TXT, and MD files.</p>
            <p>Unsupported files are recorded but not uploaded.</p>
            <p>Students never see raw reviewer paths or source files.</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Recent imports</CardTitle>
            <CardDescription>Private batches staged for extraction.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={refreshBatches} disabled={loading}>
            <RefreshCcw aria-hidden="true" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="rounded-md border bg-muted/40 p-4 text-sm font-bold text-muted-foreground">Loading imports</div>
          ) : null}
          {!loading && batches.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-md border bg-muted/40 p-5 text-center">
              <FileText className="h-8 w-8 text-primary" aria-hidden="true" />
              <p className="max-w-md text-sm font-semibold leading-6 text-muted-foreground">
                No reviewer sources have been uploaded yet.
              </p>
            </div>
          ) : null}
          {batches.map((batch) => (
            <ImportBatchRow key={batch.id} batch={batch} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ children, htmlFor, label }: { children: ReactNode; htmlFor: string; label: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function FilePreview({ file }: { file: File }) {
  const supported = isSupportedReviewerFileName(file.name);
  const Icon = supported ? CheckCircle2 : AlertTriangle;
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border bg-card p-3">
      <Icon className={supported ? "h-5 w-5 text-success" : "h-5 w-5 text-destructive"} aria-hidden="true" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{file.name}</p>
        <p className="text-xs font-semibold text-muted-foreground">{formatReviewerFileSize(file.size)}</p>
      </div>
      <Badge variant={supported ? "muted" : "destructive"}>{supported ? "Ready" : "Skipped"}</Badge>
    </div>
  );
}

function ImportBatchRow({ batch }: { batch: ReviewerImportBatch }) {
  return (
    <div className="rounded-md border bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={batch.status === "uploaded" ? "gold" : batch.status === "failed" ? "destructive" : "muted"}>
              {batch.status.replace(/_/g, " ")}
            </Badge>
            <Badge variant="muted">{batch.year}</Badge>
          </div>
          <h2 className="break-words text-lg font-extrabold">{batch.title}</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {batch.supportedCount} supported, {batch.unsupportedCount} unsupported
          </p>
        </div>
        <p className="text-xs font-semibold text-muted-foreground">{new Date(batch.createdAt).toLocaleString()}</p>
      </div>
      {batch.files.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {batch.files.map((file) => (
            <div key={file.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-card p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{file.originalName}</p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {file.extension || "unknown"} - {formatReviewerFileSize(file.sizeBytes)}
                </p>
              </div>
              <Badge variant={file.status === "uploaded" ? "gold" : file.status === "failed" || file.status === "unsupported" ? "destructive" : "muted"}>
                {file.status.replace(/_/g, " ")}
              </Badge>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Status({ children, tone }: { children: string; tone: "error" | "success" }) {
  const Icon = tone === "success" ? CheckCircle2 : XCircle;
  return (
    <div
      className={
        tone === "success"
          ? "flex gap-2 rounded-md bg-success/10 p-3 text-sm font-semibold text-success"
          : "flex gap-2 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive"
      }
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
