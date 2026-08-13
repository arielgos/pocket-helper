import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PostCard } from "./components/PostCard";
import { usePosts } from "./hooks/usePosts";

function App() {
  const { i18n, t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [visiblePostCount, setVisiblePostCount] = useState(1);
  const { latestFile, posts, downloadTime, isLoading, error, refresh } = usePosts();

  const changeLanguage = (language: "en" | "es") => {
    window.localStorage.setItem("pocket-helper-language", language);
    void i18n.changeLanguage(language);
  };

  useEffect(() => {
    setVisiblePostCount(posts.length > 0 ? 1 : 0);
  }, [posts]);

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
          <label className="language-picker">
            <span className="sr-only">{t("language")}</span>
            <select
              value={i18n.language.startsWith("es") ? "es" : "en"}
              onChange={(event) => changeLanguage(event.target.value as "en" | "es")}
              aria-label={t("language")}
            >
              <option value="en">{t("languageEnglish")}</option>
              <option value="es">{t("languageSpanish")}</option>
            </select>
          </label>
        </div>
        <div className="terminal-content">
          <p className="terminal-line"><span className="prompt">$</span> {t("fetchCommand")}</p>
          <header className="page-header">
            <div><p className="eyebrow">{t("storage")}</p><h1 id="page-title">{t("latestPosts")}</h1></div>
            <button type="button" onClick={() => void refresh()} disabled={isLoading}>
              {isLoading ? t("running") : t("refresh")}
            </button>
          </header>

        {error && (
          <p className="error" role="alert">
            <span className="prompt">!</span> {error}
          </p>
        )}

        {latestFile && (
          <div className="result" aria-live="polite">
            <div className="summary"><span>{t("updatedAt")}</span>: <strong>{latestFile.updatedAt ?? "unknown"}</strong></div>
            <div className="summary"><span>{t("items")}</span>: <strong>{posts.length}</strong></div>
            <div className="post-list">
              {posts.slice(0, visiblePostCount).map((post, index) => (
                <PostCard key={post.sourceUrl} post={post} index={index} />
              ))}
              {visiblePostCount < posts.length ? (
                <div ref={loadMoreRef} className="load-more" aria-live="polite">
                  {t("loadingNext")}
                </div>
              ) : posts.length > 0 ? (
                <div className="load-more end-of-feed" aria-live="polite">
                  <strong>{t("oops")}</strong> {t("noMore")}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {downloadTime && (
          <p className="request-time">
            {t("requestTime")}=<code>{downloadTime}</code>
          </p>
        )}
        </div>
      </section>
    </main>
  );
}

export default App;
