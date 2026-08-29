export function formatDate(date: Date): string {
  return date.toISOString();
}

export function logInfo(msg: string): void {
  console.log(`[INFO] ${msg}`);
}
