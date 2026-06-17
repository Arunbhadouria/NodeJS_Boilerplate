export function printJSON(value: unknown): void {
  console.log("JSON:", JSON.stringify(value, null, 2));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}