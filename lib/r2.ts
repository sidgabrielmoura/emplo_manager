import { S3Client, DeleteObjectsCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
const accessKeyId = process.env.ACCESS_KEY_ID!;
const secretAccessKey = process.env.SECRET_ACCESS_KEY!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Extrai a chave de objeto no R2 a partir de uma URL pública ou caminho relativo.
 */
export function extractR2Key(urlOrKey: string): string | null {
  if (!urlOrKey) return null;
  const trimmed = urlOrKey.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
      return key || null;
    }
    return decodeURIComponent(trimmed.replace(/^\/+/, ""));
  } catch {
    return trimmed.replace(/^\/+/, "");
  }
}

/**
 * Exclui múltiplos arquivos do Cloudflare R2 em lotes de até 1000 chaves.
 */
export async function deleteR2Files(keysOrUrls: (string | null | undefined)[]) {
  const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;
  if (!bucketName) {
    console.warn("CLOUDFLARE_BUCKET_NAME não configurado. Pulando exclusão no R2.");
    return { deleted: 0, errors: ["Bucket name not configured"] };
  }

  const validKeys = Array.from(
    new Set(
      keysOrUrls
        .map(k => (k ? extractR2Key(k) : null))
        .filter((k): k is string => Boolean(k && k.length > 0))
    )
  );

  if (validKeys.length === 0) {
    return { deleted: 0, errors: [] };
  }

  const batchSize = 1000;
  let deletedCount = 0;
  const errors: any[] = [];

  for (let i = 0; i < validKeys.length; i += batchSize) {
    const batch = validKeys.slice(i, i + batchSize);
    try {
      const command = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: batch.map(Key => ({ Key })),
          Quiet: true,
        },
      });
      const response = await r2.send(command);
      if (response.Errors && response.Errors.length > 0) {
        errors.push(...response.Errors);
      }
      deletedCount += batch.length - (response.Errors?.length || 0);
    } catch (err) {
      console.error("Erro ao deletar lote no R2:", err);
      errors.push(err);
    }
  }

  return { deleted: deletedCount, errors };
}

/**
 * Exclui um único arquivo do Cloudflare R2.
 */
export async function deleteR2File(keyOrUrl: string): Promise<boolean> {
  const bucketName = process.env.CLOUDFLARE_BUCKET_NAME;
  if (!bucketName) return false;

  const key = extractR2Key(keyOrUrl);
  if (!key) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await r2.send(command);
    return true;
  } catch (error) {
    console.error(`Erro ao deletar arquivo ${key} no R2:`, error);
    return false;
  }
}

