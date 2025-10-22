// src/lib/s3Helpers.ts
const WORKER_BASE = 'https://s3-proxy.novaliaprops.workers.dev';

/**
 * uploadFile
 * - pide presigned PUT al worker
 * - sube el archivo a S3
 * - imprime metadata (no guarda en BD)
 *
 * @param file File a subir
 * @param folder nombre de carpeta opcional en el bucket (ej: 'uploads' o 'clientes/juan')
 * @param userId opcional, si quieres pasar identificador al worker
 */
export async function uploadFile(
  file: File,
  folder: string | null = 'uploads',
  userId?: string | null
) {
  if (!file) throw new Error('No file provided');

  // 1) pedir presigned al worker
  const reqBody: any = {
    filename: file.name,
    contentType: file.type || 'application/octet-stream'
  };
  if (folder) reqBody.folder = folder;
  if (userId) reqBody.userId = userId;

  const resp = await fetch(`${WORKER_BASE}/generate-presigned`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody)
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error('Failed to get presigned URL: ' + txt);
  }

  const body = await resp.json().catch(() => ({}));
  const { url, key, bucket, filename: safeFilename, contentType } = body;

  if (!url || !key) throw new Error('No url/key returned from worker');

  // 2) PUT directo a S3
  const putResp = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file
  });

  if (!putResp.ok) {
    const txt = await putResp.text().catch(() => '');
    throw new Error('Upload failed: ' + txt);
  }

  // 3) metadata (imprimir en consola)
  const objectUrl = url.split('?')[0];
  const meta = {
    key,
    bucket: bucket || undefined,
    objectUrl,
    filename: safeFilename || file.name,
    originalFilename: file.name,
    contentType: contentType || file.type,
    size: file.size,
    uploadedAt: new Date().toISOString()
  };

  // Imprime (simula guardar en DB)
  console.log('UPLOAD META:', meta);

  // Devuelve metadata por si la UI la quiere usar
  return meta;
}

/**
 * downloadFileExample
 * - ejemplo que pide presigned GET al worker y fuerza descarga
 * - recibe key (ej: 'uploads/166...-my.png') y filename sugerido para guardar
 * - intenta link.download primero; si el navegador abre el recurso hace fallback fetch->blob
 *
 * @param key ruta dentro del bucket (ej: 'uploads/1234-name.png')
 * @param filename nombre sugerido para la descarga (ej: 'name.png')
 */
export async function downloadFileExample(key: string, filename?: string) {
  if (!key) throw new Error('No key specified');

  // 1) pedir presigned GET al worker (el worker acepta "key")
  const resp = await fetch(`${WORKER_BASE}/generate-presigned-download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, filename }) // filename opcional para Content-Disposition
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error('Failed to get download URL: ' + txt);
  }

  const { url } = await resp.json();
  if (!url) throw new Error('No download url returned');

  // 2) intentar descarga directa con <a download>
  try {
    const link = document.createElement('a');
    link.href = url;
    // Este atributo sugiere nombre; S3/Content-Disposition tiene prioridad sobre esto en muchos casos
    link.download = filename || '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { method: 'link', url };
  } catch (e) {
    console.warn('Link download failed, falling back to fetch->blob:', e);
  }

  // 3) fallback: fetch -> blob -> objectURL -> click
  try {
    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error('Failed to fetch file for fallback download: ' + txt);
    }
    const blob = await r.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || key.split('/').pop() || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    return { method: 'fetch-blob', size: blob.size };
  } catch (err) {
    throw new Error('Fallback download failed: ' + (err instanceof Error ? err.message : String(err)));
  }
}
