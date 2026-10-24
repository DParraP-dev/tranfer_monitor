import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDashboardStats, type Period } from "@/lib/stats";
import { formatCOP, formatNumber } from "@/lib/utils";
import { Header } from "@/components/dashboard/header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import {
  DailyAreaChart,
  MonthlyBarChart,
  TypePieChart,
} from "@/components/dashboard/charts";
import {
  TransactionsTable,
  type TxRow,
} from "@/components/dashboard/transactions-table";
import { Activity, DollarSign, Hash, Clock } from "lucide-react";

const VALID_PERIODS: Period[] = ["day", "month", "year", "all"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  const clientId = session.user.clientId;
  if (!clientId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <p className="text-muted-foreground">
          Tu usuario no está asociado a ningún cliente. Contacta al
          administrador.
        </p>
      </div>
    );
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });

  const sp = await searchParams;
  const period: Period = VALID_PERIODS.includes(sp.period as Period)
    ? (sp.period as Period)
    : "month";

  const [stats, transactions] = await Promise.all([
    getDashboardStats(clientId, period),
    prisma.transaction.findMany({
      where: { clientId },
      orderBy: { occurredAt: "desc" },
      take: 1000,
    }),
  ]);

  const rows: TxRow[] = transactions.map((t) => ({
    id: t.id,
    remitente: t.remitente,
    occurredAt: t.occurredAt.toISOString(),
    valor: Number(t.valor),
    cuenta: t.cuenta,
    tipoOperacion: t.tipoOperacion,
    correo: t.correo,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        title={client?.name ?? "Mi panel"}
        subtitle="Panel de transacciones"
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Resumen</h2>
          <PeriodSelector current={period} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Operaciones"
            value={formatNumber(stats.totalOperaciones)}
            subtitle="en el período"
            icon={Hash}
          />
          <StatCard
            title="Monto total"
            value={formatCOP(stats.montoTotal)}
            subtitle="en el período"
            icon={DollarSign}
            iconClassName="text-green-600"
          />
          <StatCard
            title="Promedio por operación"
            value={formatCOP(stats.montoPromedio)}
            icon={Activity}
          />
          <StatCard
            title="Última operación"
            value={
              stats.ultimaOperacion
                ? stats.ultimaOperacion.toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "short",
                  })
                : "—"
            }
            subtitle={
              stats.ultimaOperacion
                ? stats.ultimaOperacion.toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : undefined
            }
            icon={Clock}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DailyAreaChart data={stats.serieDiaria} />
          <TypePieChart data={stats.porTipo} />
          <MonthlyBarChart data={stats.porMes} />
        </div>

        <TransactionsTable rows={rows} />
      </main>
    </div>
  );
}
