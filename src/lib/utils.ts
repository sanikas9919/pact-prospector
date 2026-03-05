import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Treat null, undefined, "", "null", "undefined" as empty; return fallback */
export function orFallback<T>(value: T | null | undefined, fallback: string): string {
  if (value == null || value === "") return fallback;
  const s = String(value).trim().toLowerCase();
  if (s === "null" || s === "undefined") return fallback;
  return String(value);
}

/** Format contract period: start → end, with sensible fallbacks for missing dates */
export function formatContractPeriod(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): string {
  const start = orFallback(startDate, "Not specified");
  const end = orFallback(endDate, "Ongoing");
  return `${start} → ${end}`;
}

/** Parse numeric value from string (handles $500,000, ₹5L, 5 Lakh, 1.25 Cr, Rs. 14300/- for months 1-12, etc.) */
export function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const s = String(value).trim();
  const lower = s.toLowerCase();

  // Prefer number after Rs/₹/INR (avoids "months 1-12" etc. being concatenated)
  const afterCurrency = s.match(/(?:Rs\.?|₹|INR)\s*([\d,]+(?:\.[\d]*)?)/i);
  if (afterCurrency) {
    const num = parseFloat(afterCurrency[1].replace(/,/g, ""));
    if (!isNaN(num)) {
      if (/\b(lakh|lacs?)\b|\d\s*l\b/.test(lower)) return num * 1e5;
      if (/\b(crore|cr)\b/.test(lower)) return num * 1e7;
      return num;
    }
  }

  // Fallback: take first number that looks like a currency amount (3+ digits) to avoid "1" from "1-12"
  const firstAmount = s.match(/([\d,]{3,}(?:\.[\d]*)?)/);
  if (firstAmount) {
    const num = parseFloat(firstAmount[1].replace(/,/g, ""));
    if (!isNaN(num)) {
      if (/\b(lakh|lacs?)\b|\d\s*l\b/.test(lower)) return num * 1e5;
      if (/\b(crore|cr)\b/.test(lower)) return num * 1e7;
      return num;
    }
  }

  // Last resort: original logic (may concatenate digits - avoid for strings with "for", "months", etc.)
  const num = parseFloat(s.replace(/[^0-9.]/g, "") || "0");
  if (isNaN(num)) return 0;
  if (/\b(lakh|lacs?)\b|\d\s*l\b/.test(lower)) return num * 1e5;
  if (/\b(crore|cr)\b/.test(lower)) return num * 1e7;
  return num;
}

/** Format amount: < 1 L = full price, 1 L–1 Cr = Lakhs, ≥ 1 Cr = Crores. 1 L = 100,000, 1 Cr = 10,000,000 */
export function formatAmountInLakhsOrCr(
  value: string | number | null | undefined,
  fallback = "—"
): string {
  const num = parseAmount(value);
  if (num <= 0) return fallback;
  if (num >= 1e7) return `₹${(num / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (num >= 1e5) return `₹${(num / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`;
  // Amount < 1 lakh: show exact value with Indian number format (no unnecessary decimals)
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
  return `₹${formatted}`;
}
