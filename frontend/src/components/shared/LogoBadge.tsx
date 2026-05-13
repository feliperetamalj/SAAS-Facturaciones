import { cn } from "@/lib/utils";

const sizes = {
  sm: "w-7 h-7 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-14 h-14 text-2xl",
};

export function LogoBadge({ size = "md" }: { size?: keyof typeof sizes }) {
  return (
    <div className={cn("rounded-component bg-accent flex items-center justify-center text-white font-bold shrink-0", sizes[size])}>
      A
    </div>
  );
}
