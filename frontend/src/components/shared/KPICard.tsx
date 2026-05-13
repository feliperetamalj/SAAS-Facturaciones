import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "warn" | "ok" | "accent";
  className?: string;
}

export function KPICard({ title, value, subtitle, icon, trend, variant = "default", className }: Props) {
  const variantStyle = {
    default: "bg-white border-border",
    warn:    "bg-warn-soft border-warn/30",
    ok:      "bg-ok-soft border-ok/30",
    accent:  "bg-accent-soft border-accent/30",
  }[variant];

  return (
    <div className={cn("rounded-card border p-5 flex flex-col gap-2", variantStyle, className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-2 uppercase tracking-wide">{title}</span>
        {icon && <span className="text-ink-2">{icon}</span>}
      </div>
      <p className="font-mono text-2xl font-semibold text-ink leading-none">{value}</p>
      {subtitle && <p className="text-xs text-ink-2">{subtitle}</p>}
      {trend && (
        <p className={cn("text-xs font-medium", trend.positive ? "text-ok" : "text-warn")}>
          {trend.positive ? "▲" : "▼"} {trend.value}
        </p>
      )}
    </div>
  );
}
