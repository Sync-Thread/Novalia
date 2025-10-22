/**
 * Tipos y utilidades para verificación de INE mediante worker
 */

export type SendPayload = {
  userId?: string;
  nameForm?: string;
  curpForm?: string | null;
  frontImage?: string | null;
  backImage?: string | null;
  selfieImage?: string | null;
  qrDecoded?: string | null;
  meta?: Record<string, any>;
};

export type VerifyIneResponse = {
  status: number;
  body: any;
};

const DEFAULT_WORKER_URL = "https://verification.novaliaprops.workers.dev";

/**
 * Envía los datos de verificación INE al worker
 * @param payload - Datos a enviar para verificación
 * @param workerUrl - URL del worker (opcional)
 * @returns Respuesta del worker con status y body
 */
export async function verifyIne(
  payload: SendPayload,
  workerUrl: string = DEFAULT_WORKER_URL
): Promise<VerifyIneResponse> {
  try {
    const url = `${workerUrl.replace(/\/+$/, "")}/verify-ine`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    // Intentar parsear como JSON
    try {
      const json = JSON.parse(text);
      return { status: res.status, body: json };
    } catch {
      // Si no es JSON válido, devolver el texto plano
      return { status: res.status, body: text };
    }
  } catch (error) {
    throw new Error(`Error al verificar INE: ${error}`);
  }
}

/**
 * Prueba de conectividad con el worker
 * @param workerUrl - URL del worker (opcional)
 * @returns Respuesta del endpoint de prueba
 */
export async function testWorkerConnection(
  workerUrl: string = DEFAULT_WORKER_URL
): Promise<VerifyIneResponse> {
  try {
    const url = `${workerUrl.replace(/\/+$/, "")}/prueba`;

    const res = await fetch(url);
    const json = await res.json();

    return { status: res.status, body: json };
  } catch (error) {
    throw new Error(`Error al conectar con worker: ${error}`);
  }
}

/**
 * Helper para crear el payload con metadata automática
 * @param data - Datos básicos del usuario
 * @returns Payload completo con metadata
 */
export function createPayload(data: Partial<SendPayload>): SendPayload {
  return {
    ...data,
    meta: {
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "node",
      timestamp: new Date().toISOString(),
      ...data.meta,
    },
  };
}