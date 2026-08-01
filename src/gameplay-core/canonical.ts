import { createHash } from "node:crypto";

function canonical(value: unknown, stack: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new TypeError(`canonical JSON rejects ${typeof value}`);
  }
  if (typeof value !== "object") throw new TypeError("canonical JSON rejects unsupported values");
  if (stack.has(value)) throw new TypeError("canonical JSON rejects cycles");
  stack.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((entry) => canonical(entry, stack)).join(",")}]`;
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key], stack)}`).join(",")}}`;
  } finally { stack.delete(value); }
}

export function canonicalJson(value: unknown): string { return canonical(value, new Set()); }
export function sha256Canonical(value: unknown): string { return createHash("sha256").update(canonicalJson(value)).digest("hex"); }
export function digestWithout<T extends object>(value: T, omittedKeys: readonly (keyof T)[]): string {
  const copy = { ...value } as Record<string, unknown>;
  for (const key of omittedKeys) delete copy[key as string];
  return sha256Canonical(copy);
}
