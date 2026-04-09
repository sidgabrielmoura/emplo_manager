import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDaysRemaining(date: Date | string | null | undefined): string {
  if (!date) return "—";

  const expiryDate = new Date(date);
  const today = new Date();

  // Reset hours to compare only days in UTC to avoid timezone issues
  expiryDate.setUTCHours(0, 0, 0, 0);
  today.setUTCHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Vencido";
  if (diffDays === 0) return "Vence hoje";
  if (diffDays === 1) return "1 dia";
  return `${diffDays} dias`;
}
