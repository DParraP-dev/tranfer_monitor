import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { OperationType, Prisma } from "@prisma/client";

/**
 * Webhook de ingesta de transacciones (llamado por Make).
 *
 * Autenticación: header `x-api-key` con la API Key del cliente.
 *   (también se acepta `Authorization: Bearer <apiKey>`).
 *
 * Body JSON esperado (campos del Google Sheet actual):
 *   {
 *     "remitente":     "Juan Perez",
 *     "fecha":         "2026-10-24",      // YYYY-MM-DD  (o DD/MM/YYYY)
 *     "hora":          "14:35",           // HH:mm  (opcional)
 *     "valor":         150000,            // número o string "150.000"
 *     "cuenta":        "****1234",
 *     "tipoOperacion": "TRANSFERENCIA",   // o texto libre; se normaliza
 *     "correo":        "notificaciones@banco.com"
 *   }
 */

const payloadSchema = z.object({
  remitente: z.string().min(1),
  fecha: z.string().min(1),
  hora: z.string().optional(),
  valor: z.union([z.number(), z.string()]),
  cuenta: z.string().min(1),
  tipoOperacion: z.string().optional(),
  correo: z.string().min(1),
});

function getApiKey(req: NextRequest): string | null {
  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

/** Normaliza el valor "150.000" o "150,000.50" (COP) a número. */
function parseValor(input: number | string): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;

  let s = input.trim().replace(/[^\d.,-]/g, "");
  // Si hay ',' y '.', asumimos '.' como separador de miles y ',' decimal (es-CO)
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    // Solo coma: es separador decimal
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Combina fecha (YYYY-MM-DD o DD/MM/YYYY) + hora (HH:mm[:ss]) en un Date. */
function parseOccurredAt(fecha: string, hora?: string): Date | null {
  let y: number, m: number, d: number;

  const iso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmy = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (iso) {
    y = +iso[1];
    m = +iso[2];
    d = +iso[3];
  } else if (dmy) {
    d = +dmy[1];
    m = +dmy[2];
    y = +dmy[3];
  } else {
    const parsed = new Date(fecha);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  let hh = 0,
    mm = 0,
    ss = 0;
  if (hora) {
    const t = hora.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (t) {
      hh = +t[1];
      mm = +t[2];
      ss = t[3] ? +t[3] : 0;
    }
  }

  const date = new Date(y, m - 1, d, hh, mm, ss);
  return isNaN(date.getTime()) ? null : date;
}

const OPERATION_MAP: Record<string, OperationType> = {
  transferencia: "TRANSFERENCIA",
  transfer: "TRANSFERENCIA",
  deposito: "DEPOSITO",
  depósito: "DEPOSITO",
  consignacion: "DEPOSITO",
  consignación: "DEPOSITO",
  retiro: "RETIRO",
  pago: "PAGO",
};

function normalizeOperation(input?: string): OperationType {
  if (!input) return "OTRO";
  const key = input.trim().toLowerCase();
  return OPERATION_MAP[key] ?? "OTRO";
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta la API Key (header x-api-key)." },
      { status: 401 }
    );
  }

  const client = await prisma.client.findUnique({ where: { apiKey } });
  if (!client || !client.active) {
    return NextResponse.json(
      { error: "API Key inválida o cliente inactivo." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload inválido.", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;

  const valor = parseValor(data.valor);
  if (valor === null) {
    return NextResponse.json(
      { error: `No se pudo interpretar el valor: "${data.valor}".` },
      { status: 422 }
    );
  }

  const occurredAt = parseOccurredAt(data.fecha, data.hora);
  if (!occurredAt) {
    return NextResponse.json(
      { error: `No se pudo interpretar la fecha: "${data.fecha}".` },
      { status: 422 }
    );
  }

  const transaction = await prisma.transaction.create({
    data: {
      clientId: client.id,
      remitente: data.remitente,
      occurredAt,
      valor: valor as unknown as Prisma.Decimal,
      cuenta: data.cuenta,
      tipoOperacion: normalizeOperation(data.tipoOperacion),
      correo: data.correo,
      rawPayload: body as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(
    { ok: true, id: transaction.id },
    { status: 201 }
  );
}
