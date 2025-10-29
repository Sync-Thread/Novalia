/**
 * Tipos y utilidades para verificación de RPP (Registro Público de la Propiedad) mediante worker
 */

export type SendRPPPayload = {
  userId?: string;
  propertyId?: string;
  rppDocument?: string | null; // Base64 del documento RPP
  ownerName?: string;
  propertyAddress?: string;
  registrationNumber?: string;
  meta?: Record<string, any>;
};

export type VerifyRPPResponse = {
  status: number;
  body: any;
};

const DEFAULT_WORKER_URL = "https://verification.novaliaprops.workers.dev";

/**
 * Envía los datos de verificación RPP al worker
 * @param payload - Datos a enviar para verificación
 * @param workerUrl - URL del worker (opcional)
 * @returns Respuesta del worker con status y body
 */
export async function verifyRpp(
  payload: SendRPPPayload,
  workerUrl: string = DEFAULT_WORKER_URL
): Promise<VerifyRPPResponse> {
  try {
    const url = `${workerUrl.replace(/\/+$/, "")}/verify-ine`; // Usando el mismo endpoint por ahora

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
    throw new Error(`Error al verificar RPP: ${error}`);
  }
}

/**
 * Helper para crear el payload con metadata automática
 * @param data - Datos básicos del documento RPP
 * @returns Payload completo con metadata
 */
export function createRPPPayload(data: Partial<SendRPPPayload>): SendRPPPayload {
  return {
    ...data,
    meta: {
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "node",
      timestamp: new Date().toISOString(),
      documentType: "rpp",
      ...data.meta,
    },
  };
}
