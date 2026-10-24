"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCOP, formatNumber } from "@/lib/utils";
import { toggleClientActive, regenerateApiKey } from "@/app/admin/actions";
import { Copy, Check, KeyRound, Power } from "lucide-react";

export interface ClientRow {
  id: string;
  name: string;
  apiKeyMasked: string;
  active: boolean;
  email: string;
  totalOps: number;
  totalMonto: number;
}

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleToggle(id: string) {
    startTransition(() => toggleClientActive(id));
  }

  function handleRegenerate(id: string) {
    if (
      !confirm(
        "¿Regenerar la API Key? La anterior dejará de funcionar en Make inmediatamente."
      )
    )
      return;
    startTransition(async () => {
      const { apiKey } = await regenerateApiKey(id);
      setRevealed((prev) => ({ ...prev, [id]: apiKey }));
    });
  }

  function copy(id: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes</CardTitle>
        <CardDescription>
          {clients.length} cliente(s). La API Key completa solo se muestra al
          crear o regenerar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead className="text-right">Operaciones</TableHead>
              <TableHead className="text-right">Monto total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Aún no hay clientes. Crea el primero arriba.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((c) => {
                const revealedKey = revealed[c.id];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.email}
                    </TableCell>
                    <TableCell>
                      {revealedKey ? (
                        <div className="flex items-center gap-1">
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {revealedKey}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copy(c.id, revealedKey)}
                          >
                            {copiedId === c.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <code className="font-mono text-xs text-muted-foreground">
                          {c.apiKeyMasked}
                        </code>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(c.totalOps)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCOP(c.totalMonto)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "success" : "secondary"}>
                        {c.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleRegenerate(c.id)}
                          title="Regenerar API Key"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleToggle(c.id)}
                          title={c.active ? "Desactivar" : "Activar"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
