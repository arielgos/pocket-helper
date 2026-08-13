import type { LatestFile, Post } from "../types";

const latestFileUrl =
  "https://firebasestorage.googleapis.com/v0/b/pocket-helper-a4bc4.firebasestorage.app/o/latest.json";

function toMediaUrl(sourceUrl: string, timestamp: number) {
  const url = new URL(sourceUrl);

  if (url.hostname === "storage.googleapis.com") {
    const [, bucket, ...objectParts] = url.pathname.split("/");
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${objectParts.join("/")}?alt=media&time=${timestamp}`;
  }

  url.searchParams.set("alt", "media");
  url.searchParams.set("time", timestamp.toString());
  return url.toString();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function parseLatestFile(value: unknown): LatestFile {
  if (!isObject(value)) {
    throw new Error("latest.json does not contain a JSON object.");
  }

  const urls = Array.isArray(value.urls)
    ? value.urls.filter((url): url is string => typeof url === "string")
    : [];

  return {
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : undefined,
    totalItems: typeof value.totalItems === "number" ? value.totalItems : undefined,
    urls,
  };
}

function parsePost(value: unknown, sourceUrl: string): Post {
  if (!isObject(value)) {
    throw new Error("A post file does not contain a JSON object.");
  }

  return { ...value, sourceUrl } as Post;
}

export async function fetchLatestPosts(timestamp = Date.now()) {
  const latest = parseLatestFile(
    await fetchJson<unknown>(`${latestFileUrl}?alt=media&time=${timestamp}`),
  );
  const postUrls = Array.isArray(latest.urls) ? latest.urls : [];
  const posts = await Promise.all(
    postUrls.map(async (sourceUrl) =>
      parsePost(
        await fetchJson<unknown>(toMediaUrl(sourceUrl, timestamp)),
        sourceUrl,
      ),
    ),
  );

  return { latest, posts, timestamp };
}