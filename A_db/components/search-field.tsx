import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchFieldProps = Omit<React.ComponentProps<"input">, "type"> & {
  label: string;
  containerClassName?: string;
};

export function SearchField({
  label,
  containerClassName,
  className,
  ...props
}: SearchFieldProps) {
  return (
    <label
      data-slot="search-control"
      className={cn("search-control", containerClassName)}
    >
      <span className="sr-only">{label}</span>
      <Search
        data-slot="search-icon"
        className="size-[17px] shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        {...props}
        type="search"
        className={cn("search-control-input", className)}
        aria-label={props["aria-label"] ?? label}
      />
    </label>
  );
}
