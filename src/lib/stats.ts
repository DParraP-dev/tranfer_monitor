import { prisma } from "@/lib/prisma";
import {
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  format,
} from "date-fns";
import { es } from "date-fns/locale";

export type Period = "day" | "month" | "year" | "all";

export function periodStart(period: Period): Date | undefined {
  const now = new Date();
  switch (period) {
    case "day":
      return startOfDay(now);
    case "month":
      return startOfMonth(now);
    case "year":
      return startOfYear(now);
    case "all":
      return undefined;
  }
}

export interface DashboardStats {
  totalOperaciones: number;
  montoTotal: number;
  montoPromedio: number;
  ultimaOperacion: Date | null;
  // Serie temporal (últimos 30 días) para la gráfica de línea.
  serieDiaria: { fecha: string; monto: number; conteo: number }[];
  // Operaciones por mes (año actual) para la gráfica de barras.
  porMes: { mes: string; monto: number; conteo: number }[];
  // Distribución por tipo de operación para la gráfica de dona.
  porTipo: { tipo: string; conteo: number; monto: number }[];
}

/**
 * Calcula las métricas del dashboard para un cliente (o todos si clientId es null).
 * El filtro por período aplica a las tarjetas resumen.
 */
export async function getDashboardStats(
  clientId: string | null,
  period: Period
): Promise<DashboardStats> {
  const start = periodStart(period);
  const baseWhere = clientId ? { clientId } : {};
  const where = {
    ...baseWhere,
    ...(start ? { occurredAt: { gte: start } } : {}),
  };

  // Agregados del período para las tarjetas resumen.
  const [agg, ultima] = await Promise.all([
    prisma.transaction.aggregate({
      where,
      _count: true,
      _sum: { valor: true },
      _avg: { valor: true },
    }),
    prisma.transaction.findFirst({
      where: baseWhere,
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    }),
  ]);

  // Serie diaria de los últimos 30 días (independiente del filtro de período).
  const hace30 = startOfDay(subDays(new Date(), 29));
  const recientes = await prisma.transaction.findMany({
    where: { ...baseWhere, occurredAt: { gte: hace30 } },
    select: { occurredAt: true, valor: true, tipoOperacion: true },
    orderBy: { occurredAt: "asc" },
  });

  const serieMap = new Map<string, { monto: number; conteo: number }>();
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
    serieMap.set(d, { monto: 0, conteo: 0 });
  }
  for (const t of recientes) {
    const key = format(t.occurredAt, "yyyy-MM-dd");
    const entry = serieMap.get(key);
    if (entry) {
      entry.monto += Number(t.valor);
      entry.conteo += 1;
    }
  }
  const serieDiaria = Array.from(serieMap.entries()).map(([fecha, v]) => ({
    fecha: format(new Date(fecha), "dd MMM", { locale: es }),
    monto: v.monto,
    conteo: v.conteo,
  }));

  // Por mes (año actual).
  const inicioAnio = startOfYear(new Date());
  const delAnio = await prisma.transaction.findMany({
    where: { ...baseWhere, occurredAt: { gte: inicioAnio } },
    select: { occurredAt: true, valor: true, tipoOperacion: true },
  });

  const mesMap = new Map<number, { monto: number; conteo: number }>();
  for (let m = 0; m < 12; m++) mesMap.set(m, { monto: 0, conteo: 0 });
  for (const t of delAnio) {
    const m = t.occurredAt.getMonth();
    const entry = mesMap.get(m)!;
    entry.monto += Number(t.valor);
    entry.conteo += 1;
  }
  const porMes = Array.from(mesMap.entries()).map(([m, v]) => ({
    mes: format(new Date(2000, m, 1), "MMM", { locale: es }),
    monto: v.monto,
    conteo: v.conteo,
  }));

  // Por tipo de operación (dentro del período seleccionado).
  const porTipoRaw = await prisma.transaction.groupBy({
    by: ["tipoOperacion"],
    where,
    _count: true,
    _sum: { valor: true },
  });
  const porTipo = porTipoRaw.map((r) => ({
    tipo: r.tipoOperacion,
    conteo: r._count,
    monto: Number(r._sum.valor ?? 0),
  }));

  return {
    totalOperaciones: agg._count,
    montoTotal: Number(agg._sum.valor ?? 0),
    montoPromedio: Number(agg._avg.valor ?? 0),
    ultimaOperacion: ultima?.occurredAt ?? null,
    serieDiaria,
    porMes,
    porTipo,
  };
}
