import { EstadoFactura } from "@/types";
import { estadoConfig } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  estado: EstadoFactura;
  className?: string;
}

export function StatusBadge({ estado, className }: Props) {
  const cfg = estadoConfig[estado];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", cfg.bg, cfg.color, className)}>
      {cfg.label}
    </span>
  );
}
