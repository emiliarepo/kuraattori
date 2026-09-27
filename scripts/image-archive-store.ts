import sharp from "sharp";

import {
  IMAGE_ARCHIVE_BUCKET,
  type ResizedImage,
} from "~/server/import/image-archive";

export interface ArchiveStore {
  put: (key: string, body: Uint8Array) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export async function resizeImage(original: Uint8Array): Promise<ResizedImage> {
  const { data, info } = await sharp(original)
    .rotate()
    .resize({
      width: 1200,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78 })
    .toBuffer({ resolveWithObject: true });
  return { body: data, width: info.width, height: info.height };
}

/** The R2 object API that `wrangler r2 object put` uses, authorised by the same API token. */
export function createRemoteArchiveStore({
  accountId,
  apiToken,
}: {
  accountId: string;
  apiToken: string;
}): ArchiveStore {
  const request = async (key: string, init: RequestInit) => {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${IMAGE_ARCHIVE_BUCKET}/objects/${key}`,
      {
        ...init,
        headers: { Authorization: `Bearer ${apiToken}`, ...init.headers },
      },
    );
    if (!response.ok && response.status !== 404)
      throw new Error(
        `R2 ${init.method} ${key} failed: ${response.status} ${await response.text()}`,
      );
  };
  return {
    put: (key, body) =>
      request(key, {
        method: "PUT",
        body: new Uint8Array(body),
        headers: { "Content-Type": "image/webp" },
      }),
    delete: (key) => request(key, { method: "DELETE" }),
  };
}

export function createBindingArchiveStore(bucket: R2Bucket): ArchiveStore {
  return {
    put: async (key, body) => {
      await bucket.put(key, body, {
        httpMetadata: { contentType: "image/webp" },
      });
    },
    delete: (key) => bucket.delete(key),
  };
}
