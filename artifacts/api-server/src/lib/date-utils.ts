export function toDateString(value: string | Date | undefined | null): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
