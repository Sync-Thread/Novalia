// guardado de archivos en aws s3
// descarga de archivos desde aws s3

const WORKER_BASE = "https://s3-proxy.novaliaprops.workers.dev";
// util: calcula SHA-256 y devuelve hex
async function fileSha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const FileUpload = async (file: File, userId?: string) => {
  try {
    // pedir presigned (PUT) al worker (worker crea key y nos devuelve bucket/filename si lo configuras)
    const resp = await fetch(`${WORKER_BASE}/generate-presigned`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        userId,
      }),
    });
    if (!resp.ok) throw new Error("Failed to get presigned URL");
    const payload = await resp.json();
    // el worker debería devolver: { url, key, bucket, filename, contentType }
    const {
      url,
      key: returnedKey,
      bucket,
      filename: safeFilename,
      contentType: returnedContentType,
    } = payload;

    if (!url || !returnedKey) throw new Error("No url/key returned");

    // setKey(returnedKey);

    // calcular checksum SHA-256 del archivo (hex)
    const checksum_sha256 = await fileSha256Hex(file);

    // subir a S3 con PUT
    const upload = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!upload.ok) throw new Error("Upload failed");

    // construir objectUrl (sin query params)
    const objectUrl = url.split("?")[0];

    // construir el objeto de metadata que vas a "imprimir" (y luego usar para guardar en DB)
    const metadata = {
      s3_bucket: bucket || WORKER_BASE || null,
      s3_key: returnedKey,
      object_url: objectUrl,
      filename: safeFilename || file.name,
      content_type:
        returnedContentType || file.type || "application/octet-stream",
      size_bytes: file.size,
      checksum_sha256,
      uploaded_at: new Date().toISOString(),
      uploader_user_id: userId || null,
      // campos opcionales útiles:
      version: "v1",
    };

    // IMPRESIÓN (tú la usarás para persistir en DB)
    console.log("=== Upload metadata ===");
    console.log(metadata);
    // si quieres una impresión "bonita":
    console.log(JSON.stringify(metadata, null, 2));

    // setNameFile(file.name);
    alert("Upload complete");
  } catch (err) {
    console.error("Upload error:", err);
    alert(
      "Upload failed: " + (err instanceof Error ? err.message : String(err))
    );
  }
};

const downloadFile = async (key: string, filename: string) => {
  try {
    if (!key) {
      alert("No key specified");
      return;
    }

    const direccion = `${filename}`;

    const resp = await fetch(`${WORKER_BASE}/generate-presigned-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: key, filename: direccion }), // <-- agregar filename
    });
    if (!resp.ok) throw new Error("Failed to get download URL");
    const { url } = await resp.json();
    if (!url) throw new Error("No download url returned");

    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Download failed:", err);
    alert("No se pudo descargar el archivo.");
  }
};

export { FileUpload, downloadFile };
