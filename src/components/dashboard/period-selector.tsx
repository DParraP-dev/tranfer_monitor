"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Period } from "@/lib/stats";

const OPTIONS: { value: Period; label: string }[] = [
  { value: "day", label: "Hoy" },
  { value: "month", label: "Este mes" },
  { value: "year", label: "Este año" },
  { value: "all", label: "Todo" },
];

export function PeriodSelector({ current }: { current: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(period: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border bg-card p-1">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={current === opt.value ? "default" : "ghost"}
          size="sm"
          onClick={() => select(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
