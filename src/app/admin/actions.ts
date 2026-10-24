"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("No autorizado.");
  }
}

function generateApiKey(): string {
  return "tm_" + randomBytes(24).toString("hex");
}

export type ActionState = { ok: boolean; message: string; apiKey?: string };

const createClientSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Correo inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

/** Crea un cliente (tenant) + su usuario de acceso + su API Key. */
export async function createClient(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const { name, email, password } = parsed.data;
  const emailLower = email.toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: emailLower },
  });
  if (existing) {
    return { ok: false, message: "Ya existe un usuario con ese correo." };
  }

  const apiKey = generateApiKey();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.client.create({
    data: {
      name,
      apiKey,
      users: {
        create: {
          name,
          email: emailLower,
          passwordHash,
          role: "CLIENT",
        },
      },
    },
  });

  revalidatePath("/admin");
  return {
    ok: true,
    message: `Cliente "${name}" creado. Guarda su API Key (no se vuelve a mostrar completa).`,
    apiKey,
  };
}

export async function toggleClientActive(clientId: string): Promise<void> {
  await requireAdmin();
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return;
  await prisma.client.update({
    where: { id: clientId },
    data: { active: !client.active },
  });
  revalidatePath("/admin");
}

export async function regenerateApiKey(
  clientId: string
): Promise<{ apiKey: string }> {
  await requireAdmin();
  const apiKey = generateApiKey();
  await prisma.client.update({
    where: { id: clientId },
    data: { apiKey },
  });
  revalidatePath("/admin");
  return { apiKey };
}
