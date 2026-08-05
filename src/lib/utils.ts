import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a user-supplied search term before it is interpolated into a
 * PostgREST filter string (`.or(...)` / `.ilike(...)`).
 * Strips filter metacharacters and LIKE wildcards so the input cannot alter
 * the intended query logic.
 */
export function sanitizeSearchTerm(input: string, maxLength = 100): string {
  return input
    .replace(/[\\%_,()"':*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
