import { cn } from "@/lib/utils";
import { Avatar, initials } from "@/components/ui/avatar";

export function ResponsibleCell({
  name,
  position,
  className,
}: {
  name?: string;
  position?: string;
  className?: string;
}) {
  if (!name) {
    return <span className="text-sm text-text-tertiary">Unassigned</span>;
  }
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Avatar className="size-8 text-xs">{initials(name)}</Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground" title={name}>
          {name}
        </p>
        {position && (
          <p className="truncate text-xs text-text-tertiary" title={position}>
            {position}
          </p>
        )}
      </div>
    </div>
  );
}
