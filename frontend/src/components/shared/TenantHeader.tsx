import { ArrowLeft } from "lucide-react";
import { LogoBadge } from "./LogoBadge";
import { ReactNode } from "react";

interface Props {
  title: string;
  onBack: () => void;
  sticky?: boolean;
  actions?: ReactNode;
}

export function TenantHeader({ title, onBack, sticky = false, actions }: Props) {
  return (
    <header className={`bg-white border-b border-border px-4 py-3 flex items-center gap-3 z-10 ${sticky ? "sticky top-0" : ""}`}>
      <button onClick={onBack} className="text-ink-2 hover:text-ink transition-colors">
        <ArrowLeft size={18} />
      </button>
      <LogoBadge size="sm" />
      <span className="text-sm font-semibold text-ink">{title}</span>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
}
