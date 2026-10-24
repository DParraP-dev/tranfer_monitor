import { Button } from "@/components/ui/button";
import { doSignOut } from "@/app/actions/signout";
import { LineChart, LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <LineChart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <form action={doSignOut}>
          <Button variant="outline" size="sm" type="submit">
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </form>
      </div>
    </header>
  );
}
