import { PrismaClient, type OperationType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function apiKey() {
  return "tm_" + randomBytes(24).toString("hex");
}

const REMITENTES = [
  "Juan Pérez",
  "María Gómez",
  "Carlos Rodríguez",
  "Ana Martínez",
  "Luis Ramírez",
  "Sofía Torres",
  "Andrés Castro",
  "Valentina Díaz",
];
const TIPOS: OperationType[] = [
  "TRANSFERENCIA",
  "DEPOSITO",
  "RETIRO",
  "PAGO",
  "OTRO",
];
const BANCOS = [
  "notificaciones@bancolombia.com.co",
  "alertas@davivienda.com",
  "avisos@bbva.com.co",
  "no-reply@nequi.com.co",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  const past = now - Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(past);
}

async function main() {
  console.log("🌱 Seed: limpiando datos previos...");
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();

  // --- Administrador ---
  const adminPassword = "admin123";
  await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@transfermonitor.com",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: "ADMIN",
    },
  });
  console.log("👤 Admin creado: admin@transfermonitor.com / admin123");

  // --- Clientes demo ---
  const demoClients = [
    { name: "Empresa ABC", email: "cliente1@demo.com" },
    { name: "Comercial XYZ", email: "cliente2@demo.com" },
  ];

  for (const dc of demoClients) {
    const key = apiKey();
    const client = await prisma.client.create({
      data: {
        name: dc.name,
        apiKey: key,
        users: {
          create: {
            name: dc.name,
            email: dc.email,
            passwordHash: await bcrypt.hash("cliente123", 10),
            role: "CLIENT",
          },
        },
      },
    });

    // ~120 transacciones repartidas en el último año.
    const count = 100 + Math.floor(Math.random() * 60);
    const txs = Array.from({ length: count }).map(() => ({
      clientId: client.id,
      remitente: rand(REMITENTES),
      occurredAt: randomDateWithinDays(365),
      valor: Math.round((50_000 + Math.random() * 4_950_000) / 100) * 100,
      cuenta: "****" + (1000 + Math.floor(Math.random() * 8999)),
      tipoOperacion: rand(TIPOS),
      correo: rand(BANCOS),
    }));
    await prisma.transaction.createMany({ data: txs });

    console.log(
      `🏢 Cliente "${dc.name}" (${dc.email} / cliente123) — ${count} transacciones`
    );
    console.log(`   🔑 API Key: ${key}`);
  }

  console.log("\n✅ Seed completado.");
  console.log("   Admin:   admin@transfermonitor.com / admin123");
  console.log("   Cliente: cliente1@demo.com / cliente123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
