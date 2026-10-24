import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transfer Monitor",
  description: "Panel de monitoreo de transacciones bancarias",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
