"use client";

import * as React from "react";
import { toast } from "sonner";

import { Stepper, type ImportStep } from "@/components/imports/stepper";
import { UploadStep } from "@/components/imports/upload-step";
import { ReviewStep } from "@/components/imports/review-step";
import { ProgressResult } from "@/components/imports/progress-result";
import {
  useValidateImport,
  useCommitImport,
  useImportJob,
  isTerminal,
} from "@/lib/api/import-hooks";
import { errorMessage } from "@/lib/api/errors";
import type { ImportJobOptions, ImportPreview } from "@/lib/api/types";

const DEFAULT_OPTIONS: ImportJobOptions = {
  onConflict: "error",
  importValidOnly: false,
};

export function ImportWizard() {
  const [phase, setPhase] = React.useState<"upload" | "review">("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const [options, setOptions] = React.useState<ImportJobOptions>(DEFAULT_OPTIONS);
  const [jobId, setJobId] = React.useState<string | null>(null);

  const validate = useValidateImport();
  const commit = useCommitImport();
  const jobQuery = useImportJob(jobId ?? undefined);
  const job = jobQuery.data;

  // Steps before commit are explicit; after commit they follow the job status.
  const step: ImportStep = jobId
    ? isTerminal(job?.status)
      ? "result"
      : "importing"
    : phase;

  function handleValidate() {
    if (!file) return;
    validate.mutate(
      { file },
      {
        onSuccess: (p) => {
          setPreview(p);
          setPhase("review");
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  function handleImport() {
    if (!preview) return;
    commit.mutate(
      { importJobId: preview.job.id, options },
      {
        onSuccess: (createdJob) => {
          if (createdJob) setJobId(createdJob.id);
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  function reset() {
    setPhase("upload");
    setFile(null);
    setPreview(null);
    setOptions(DEFAULT_OPTIONS);
    setJobId(null);
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-1">
        <Stepper current={step} />
      </div>

      {step === "upload" && (
        <UploadStep
          file={file}
          onFileChange={setFile}
          onValidate={handleValidate}
          validating={validate.isPending}
        />
      )}

      {step === "review" && preview && (
        <ReviewStep
          preview={preview}
          options={options}
          onOptionsChange={setOptions}
          onBack={() => {
            setPhase("upload");
            setPreview(null);
          }}
          onImport={handleImport}
          importing={commit.isPending}
        />
      )}

      {(step === "importing" || step === "result") && jobId && (
        <ProgressResult
          jobId={jobId}
          job={job}
          isError={jobQuery.isError}
          onRetry={() => jobQuery.refetch()}
          onStartAnother={reset}
        />
      )}
    </div>
  );
}
