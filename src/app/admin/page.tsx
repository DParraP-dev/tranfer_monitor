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
import { CreateClientForm } from "@/components/admin/create-client-form";
import {
  ClientsTable,
  type ClientRow,
} from "@/components/admin/clients-table";
import { Users, DollarSign, Hash, Activity } from "lucide-react";

const VALID_PERIODS: Period[] = ["day", "month", "year", "all"];

function maskApiKey(key: string): string {
  if (key.length <= 10) return "••••";
  return `${key.slice(0, 6)}••••••${key.slice(-4)}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const period: Period = VALID_PERIODS.includes(sp.period as Period)
    ? (sp.period as Period)
    : "month";

  const [stats, clients, transactions, clientCount] = await Promise.all([
    getDashboardStats(null, period),
    prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: { where: { role: "CLIENT" }, take: 1 },
        _count: { select: { transactions: true } },
      },
    }),
    prisma.transaction.findMany({
      orderBy: { occurredAt: "desc" },
      take: 1000,
      include: { client: { select: { name: true } } },
    }),
    prisma.client.count(),
  ]);

  // Monto total por cliente.
  const montosPorCliente = await prisma.transaction.groupBy({
    by: ["clientId"],
    _sum: { valor: true },
  });
  const montoMap = new Map(
    montosPorCliente.map((m) => [m.clientId, Number(m._sum.valor ?? 0)])
  );

  const clientRows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    apiKeyMasked: maskApiKey(c.apiKey),
    active: c.active,
    email: c.users[0]?.email ?? "—",
    totalOps: c._count.transactions,
    totalMonto: montoMap.get(c.id) ?? 0,
  }));

  const txRows: TxRow[] = transactions.map((t) => ({
    id: t.id,
    remitente: t.remitente,
    occurredAt: t.occurredAt.toISOString(),
    valor: Number(t.valor),
    cuenta: t.cuenta,
    tipoOperacion: t.tipoOperacion,
    correo: t.correo,
    clientName: t.client.name,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Panel de administración" subtitle="Transfer Monitor" />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Vista global</h2>
          <PeriodSelector current={period} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Clientes"
            value={formatNumber(clientCount)}
            subtitle="total registrados"
            icon={Users}
          />
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
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DailyAreaChart data={stats.serieDiaria} />
          <TypePieChart data={stats.porTipo} />
          <MonthlyBarChart data={stats.porMes} />
        </div>

        <CreateClientForm />
        <ClientsTable clients={clientRows} />
        <TransactionsTable rows={txRows} showClient />
      </main>
    </div>
  );
}
