"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCOP } from "@/lib/utils";
import { Download, Search } from "lucide-react";

export interface TxRow {
  id: string;
  remitente: string;
  occurredAt: string; // ISO
  valor: number;
  cuenta: string;
  tipoOperacion: string;
  correo: string;
  clientName?: string; // solo en vista admin
}

const TYPE_LABELS: Record<string, string> = {
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
  RETIRO: "Retiro",
  PAGO: "Pago",
  OTRO: "Otro",
};

const TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  TRANSFERENCIA: "default",
  DEPOSITO: "success",
  RETIRO: "warning",
  PAGO: "secondary",
  OTRO: "outline",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TransactionsTable({
  rows,
  showClient = false,
}: {
  rows: TxRow[];
  showClient?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        !search ||
        r.remitente.toLowerCase().includes(search.toLowerCase()) ||
        r.cuenta.toLowerCase().includes(search.toLowerCase()) ||
        r.correo.toLowerCase().includes(search.toLowerCase()) ||
        (r.clientName?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchesType = !typeFilter || r.tipoOperacion === typeFilter;

      const d = new Date(r.occurredAt);
      const matchesFrom = !from || d >= new Date(from);
      const matchesTo = !to || d <= new Date(`${to}T23:59:59`);

      return matchesSearch && matchesType && matchesFrom && matchesTo;
    });
  }, [rows, search, typeFilter, from, to]);

  function exportCSV() {
    const headers = [
      ...(showClient ? ["Cliente"] : []),
      "Remitente",
      "Fecha y hora",
      "Valor (COP)",
      "Cuenta",
      "Tipo",
      "Correo",
    ];
    const lines = filtered.map((r) =>
      [
        ...(showClient ? [r.clientName ?? ""] : []),
        r.remitente,
        formatDateTime(r.occurredAt),
        r.valor,
        r.cuenta,
        TYPE_LABELS[r.tipoOperacion] ?? r.tipoOperacion,
        r.correo,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Transacciones</CardTitle>
            <CardDescription>
              {filtered.length} de {rows.length} operaciones
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            title="Desde"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            title="Hasta"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {showClient && <TableHead>Cliente</TableHead>}
              <TableHead>Remitente</TableHead>
              <TableHead>Fecha y hora</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Correo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showClient ? 7 : 6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No hay transacciones que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  {showClient && (
                    <TableCell className="font-medium">
                      {r.clientName}
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{r.remitente}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(r.occurredAt)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCOP(r.valor)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.cuenta}</TableCell>
                  <TableCell>
                    <Badge variant={TYPE_VARIANTS[r.tipoOperacion] ?? "outline"}>
                      {TYPE_LABELS[r.tipoOperacion] ?? r.tipoOperacion}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.correo}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
