import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** A titled group of fields, separated from siblings by a divider. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 border-t border-border pt-6 first:border-t-0 first:pt-0",
        className,
      )}
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-text-secondary">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/**
 * Label-above-field row with required marker, helper text (Gray 500) and
 * error text (Error 600). Pass the field control as children.
 */
export function FormRow({
  label,
  htmlFor,
  required,
  helper,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const helperId = htmlFor ? `${htmlFor}-helper` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-error-600 dark:text-error-400" aria-hidden>
            *
          </span>
        )}
      </Label>
      {/* propagate describedby/invalid to the control where possible */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id: (children.props as { id?: string }).id ?? htmlFor,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error ? errorId : helper ? helperId : undefined,
          })
        : children}
      {error ? (
        <p id={errorId} className="text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-sm text-text-tertiary">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/** Right-aligned action row for a form (cancel left of primary submit). */
export function FormActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-border pt-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
