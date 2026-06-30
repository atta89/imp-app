import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type ImportStep = "upload" | "review" | "importing" | "result";

const STEPS: { key: ImportStep; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "review", label: "Review" },
  { key: "importing", label: "Import" },
  { key: "result", label: "Done" },
];

export function Stepper({ current }: { current: ImportStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="p-1 flex items-center">
      {STEPS.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
        return (
          <li key={step.key} className="flex items-center">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  state === "done" && "bg-brand text-brand-foreground",
                  state === "current" &&
                    "bg-brand-50 text-brand-700 ring-2 ring-brand-300 dark:bg-brand-400/15 dark:text-brand-300 dark:ring-brand-400/40",
                  state === "upcoming" &&
                    "bg-muted text-text-tertiary",
                )}
              >
                {state === "done" ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  state === "upcoming" ? "text-text-tertiary" : "text-foreground",
                  // hide labels for non-current steps on small screens
                  state !== "current" && "hidden sm:inline",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "mx-2 h-px w-6 sm:w-10",
                  i < currentIndex ? "bg-brand" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
