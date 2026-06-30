import { cn } from "@/lib/utils";

/**
 * Centers and pads page content consistently.
 * Desktop ~px-8 py-6, mobile ~px-4 py-4, capped at 1440px.
 * `wide` lets data-heavy screens use the full width for tables.
 */
export function PageContainer({
  className,
  wide = false,
  children,
}: {
  className?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 py-4 lg:px-8 lg:py-6",
        wide ? "max-w-[1600px]" : "max-w-[1440px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
