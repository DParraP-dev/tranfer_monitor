# Transfer Monitor

Panel profesional multi-cliente para monitorear transacciones bancarias capturadas
por un flujo automatizado en **Make**. Cada cliente inicia sesión y ve únicamente
sus propias transacciones, con reportes, gráficas y una tabla detallada filtrable.
Incluye un **panel de administración** para dar de alta clientes y generar sus API Keys.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** — web del cliente **y** API.
- **PostgreSQL** + **Prisma** — base de datos y ORM (multi-tenant por `clientId`).
- **Auth.js (NextAuth v5)** — autenticación con credenciales y roles (ADMIN / CLIENT).
- **Tailwind CSS** + componentes estilo shadcn/ui + **Recharts** — UI y gráficas.
- Moneda: **COP** (pesos colombianos).

---

## Puesta en marcha en local (paso a paso)

> Requisitos: **Node.js 20+** y **Docker** (para la base de datos). Si ya tienes
> un PostgreSQL propio, puedes omitir Docker y usar tu `DATABASE_URL`.

### 1. Instalar dependencias

```bash
npm install
```

### 2. Levantar PostgreSQL con Docker

```bash
docker compose up -d
```

Esto levanta Postgres en `localhost:5432` (usuario `postgres`, clave `postgres`,
base `transfer_monitor`).

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`. Para el entorno Docker de arriba, usa:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transfer_monitor?schema=public"
AUTH_SECRET="pega-aqui-un-secreto-largo"
NEXTAUTH_URL="http://localhost:3000"
```

Genera el `AUTH_SECRET` con:

```bash
openssl rand -base64 32
```

### 4. Crear las tablas y cargar datos de prueba

```bash
npm run db:push    # crea las tablas en la BD según prisma/schema.prisma
npm run db:seed    # crea admin, 2 clientes demo y ~240 transacciones de prueba
```

El seed imprime en consola las credenciales y las **API Keys** generadas.

### 5. Arrancar la app

```bash
npm run dev
```

Abre <http://localhost:3000>.

### Credenciales de prueba (del seed)

| Rol     | Correo                          | Contraseña    |
| ------- | ------------------------------- | ------------- |
| Admin   | `admin@transfermonitor.com`     | `admin123`    |
| Cliente | `cliente1@demo.com`             | `cliente123`  |
| Cliente | `cliente2@demo.com`             | `cliente123`  |

---

## Cómo conectar tu flujo de Make

En tu escenario de Make, añade un módulo **HTTP → Make a request** al final del flujo,
una vez tengas extraídos los datos de la transacción:

- **URL:** `https://TU-DOMINIO/api/transactions` (en local: `http://localhost:3000/api/transactions`)
- **Method:** `POST`
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: <LA API KEY DEL CLIENTE>`  ← cada cliente tiene su propia key (la ves en el panel admin)
- **Body (JSON):**

```json
{
  "remitente": "Juan Pérez",
  "fecha": "2026-10-24",
  "hora": "14:35",
  "valor": 150000,
  "cuenta": "****1234",
  "tipoOperacion": "TRANSFERENCIA",
  "correo": "notificaciones@banco.com"
}
```

Notas sobre el payload:

- `fecha` acepta `YYYY-MM-DD` o `DD/MM/YYYY`.
- `hora` es opcional (`HH:mm` o `HH:mm:ss`).
- `valor` acepta número (`150000`) o texto con formato COP (`"150.000"`).
- `tipoOperacion` se normaliza a: `TRANSFERENCIA`, `DEPOSITO`, `RETIRO`, `PAGO` u `OTRO`.
- La API Key determina a **qué cliente** pertenece la transacción — por eso cada cliente
  usa la suya. No hace falta enviar un `clientId`.

### Probar el webhook sin Make (curl)

Usa una API Key que haya impreso el seed:

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "x-api-key: tm_XXXXXXXXXXXXXXXX" \
  -d '{
    "remitente": "Prueba Manual",
    "fecha": "2026-10-24",
    "hora": "09:15",
    "valor": 250000,
    "cuenta": "****9999",
    "tipoOperacion": "DEPOSITO",
    "correo": "test@banco.com"
  }'
```

Respuesta esperada: `{ "ok": true, "id": "..." }`.

---

## Flujo de trabajo del administrador

1. Entra como admin.
2. En **Nuevo cliente**, crea el cliente con su correo y contraseña inicial.
   Se genera su **API Key** (cópiala: solo se muestra completa en ese momento).
3. Configura esa API Key en el webhook de Make de ese cliente.
4. El cliente ya puede entrar con su correo/contraseña y ver solo sus transacciones.
5. Puedes **desactivar** un cliente (deja de aceptar su webhook) o **regenerar** su API Key.

---

## Scripts útiles

| Comando              | Descripción                                   |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo                        |
| `npm run build`      | Build de producción                           |
| `npm run start`      | Servir el build de producción                 |
| `npm run db:push`    | Sincroniza el esquema Prisma con la BD        |
| `npm run db:seed`    | Carga datos de prueba                         |
| `npm run db:studio`  | Abre Prisma Studio (explorador visual de BD)  |

---

## Seguridad y multi-tenancy

- Cada transacción está ligada a un `clientId`. Las consultas del dashboard **siempre**
  filtran por el `clientId` de la sesión, de modo que un cliente nunca ve datos de otro.
- El webhook se autentica con **API Key por cliente** (header `x-api-key`), validada
  contra la base de datos; una key inválida o un cliente inactivo se rechazan (401/403).
- Las contraseñas se almacenan con **hash bcrypt**.
- Las rutas `/admin` y `/dashboard` están protegidas por middleware según el rol.

---

## Despliegue (siguiente fase)

Para tener la herramienta "al aire" 24/7 con un solo plan que albergue todos tus
clientes, las opciones recomendadas son **Railway**, **Render** o **Fly.io**
(app + Postgres administrado en un mismo proveedor). Cuando quieras, preparamos el
despliegue y el dominio.
