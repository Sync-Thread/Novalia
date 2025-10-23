const TEMPLATE = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

export function generateId(): string {
  const cryptoObj = globalThis.crypto;
  let values: number[] | Uint8Array | undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buffer = new Uint8Array(16);
    cryptoObj.getRandomValues(buffer);
    values = Array.from(buffer);
  }
  let index = 0;
  return TEMPLATE.replace(/[xy]/g, char => {
    const rand = values ? values[index++] ?? 0 : Math.floor(Math.random() * 16);
    const value = char === "x" ? rand & 0xf : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}
