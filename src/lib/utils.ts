import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Formatea un número como moneda COP (ej: $1.234.567). */
export function formatCOP(value: number): string {
  return copFormatter.format(value);
}

const numberFormatter = new Intl.NumberFormat("es-CO");

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}
