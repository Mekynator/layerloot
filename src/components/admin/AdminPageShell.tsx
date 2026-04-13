import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface AdminPageShellProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Shared page shell for all admin module pages.
 * Provides consistent title area, optional description, icon, and action buttons.
 */
const AdminPageShell = ({ title, description, icon: Icon, actions, children }: AdminPageShellProps) => (
  <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

export default AdminPageShell;
