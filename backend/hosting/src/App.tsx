import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const latestFileUrl =
  "https://firebasestorage.googleapis.com/v0/b/pocket-helper-a4bc4.firebasestorage.app/o/latest.json";

interface LatestFile {
  updatedAt?: string;
  totalItems?: number;
  urls?: string[];
  [key: string]: unknown;
}

interface Post {
  date?: number;
  content?: string;
  image?: string;
  sourceUrl: string;
}

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

function getSocialPostTitle(content: string) {
  const lines = content.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) =>
    /^##\s+Social Media Post\s*$/i.test(line.trim()),
  );

  if (headingIndex === -1) return "Untitled post";
  return lines.slice(headingIndex + 1).find((line) => line.trim())?.trim() ?? "Untitled post";
}

function removeSocialPostTitle(content: string) {
  const lines = content.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) =>
    /^##\s+Social Media Post\s*$/i.test(line.trim()),
  );

  if (headingIndex === -1) return content;

  const titleIndex = lines.findIndex(
    (line, index) => index > headingIndex && line.trim(),
  );

  if (titleIndex === -1) return content;
  return lines.slice(0, titleIndex).concat(lines.slice(titleIndex + 1)).join("\n");
}

function App() {
  const [latestFile, setLatestFile] = useState<LatestFile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [visiblePostCount, setVisiblePostCount] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [downloadTime, setDownloadTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const downloadAndParseLatestFile = useCallback(async () => {
    const timestamp = Date.now();
    setDownloadTime(timestamp);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${latestFileUrl}?alt=media&time=${timestamp}`,
      );
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}.`);
      }

      const parsedFile: unknown = await response.json();
      if (!parsedFile || typeof parsedFile !== "object") {
        throw new Error("The downloaded file does not contain a JSON object.");
      }

      const latest = parsedFile as LatestFile;
      const postUrls = Array.isArray(latest.urls) ? latest.urls : [];
      const downloadedPosts = await Promise.all(
        postUrls.map(async (sourceUrl) => {
          const postResponse = await fetch(toMediaUrl(sourceUrl, timestamp));
          if (!postResponse.ok) {
            throw new Error(`A post failed with status ${postResponse.status}.`);
          }

          const post: unknown = await postResponse.json();
          if (!post || typeof post !== "object") {
            throw new Error("A post file does not contain a JSON object.");
          }

          return { ...(post as Omit<Post, "sourceUrl">), sourceUrl };
        }),
      );

      setLatestFile(latest);
      setPosts(downloadedPosts);
      setVisiblePostCount(downloadedPosts.length > 0 ? 1 : 0);
    } catch (downloadError) {
      setError(
        
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download latest.json.",
      );
      setLatestFile(null);
      setPosts([]);
      setVisiblePostCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void downloadAndParseLatestFile();
  }, [downloadAndParseLatestFile]);

  useEffect(() => {
    if (visiblePostCount >= posts.length || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisiblePostCount((currentCount) =>
            Math.min(currentCount + 1, posts.length),
          );
        }
      },
      { rootMargin: "240px" },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [posts.length, visiblePostCount]);

  return (
    <main className="app">
      <section className="file-panel" aria-labelledby="page-title">
        <div className="terminal-bar">
          <span className="terminal-dot" />
          <span className="terminal-dot" />
          <span className="terminal-dot" />
          <span className="terminal-title">pocket-helper // posts</span>
        </div>
        <div className="terminal-content">
          <p className="terminal-line"><span className="prompt">$</span> fetch latest.json --fresh</p>
          <header className="page-header">
            <div><p className="eyebrow">Firebase Storage</p><h1 id="page-title">Latest posts</h1></div>
            <button type="button" onClick={() => void downloadAndParseLatestFile()} disabled={isLoading}>
              {isLoading ? "running..." : "refresh"}
            </button>
          </header>

        {error && (
          <p className="error" role="alert">
            <span className="prompt">!</span> {error}
          </p>
        )}

        {latestFile && (
          <div className="result" aria-live="polite">
            <div className="summary"><span>updated_at</span><strong>{latestFile.updatedAt ?? "unknown"}</strong></div>
            <div className="summary"><span>items</span><strong>{posts.length}</strong></div>
            <div className="post-list">
              {posts.slice(0, visiblePostCount).map((post, index) => (
                <article className="post" key={post.sourceUrl}>
                  <div className="post-header">
                    <span>post_{String(index + 1).padStart(2, "0")}</span>
                    {post.date && <time dateTime={new Date(post.date).toISOString()}>{new Date(post.date).toLocaleString()}</time>}
                  </div>
                  <div className="post-body">
                    <h2 className="post-title">
                      {getSocialPostTitle(post.content ?? "")}
                    </h2>
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {removeSocialPostTitle(post.content ?? "(empty post)")}
                      </ReactMarkdown>
                    </div>
                    {post.image && <img src={post.image} alt={`Post ${index + 1}`} />}
                  </div>
                  <a href={post.sourceUrl} target="_blank" rel="noreferrer">{post.sourceUrl}</a>
                </article>
              ))}
              {visiblePostCount < posts.length ? (
                <div ref={loadMoreRef} className="load-more" aria-live="polite">
                  loading next post...
                </div>
              ) : posts.length > 0 ? (
                <div className="load-more end-of-feed" aria-live="polite">
                  <strong>Oops...</strong> no more posts to go!
                </div>
              ) : null}
            </div>
          </div>
        )}

        {downloadTime && (
          <p className="request-time">
            request_time=<code>{downloadTime}</code>
          </p>
        )}
        </div>
      </section>
    </main>
  );
}

export default App;
