import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { getPostTitle } from "../lib/postTitle";
import type { Post } from "../types";

interface PostCardProps {
  post: Post;
  index: number;
}

export function PostCard({ post, index }: PostCardProps) {
  const { t } = useTranslation();

  return (
    <article className="post">
      <div className="post-header">
        <span>post_{String(index + 1).padStart(2, "0")}</span>
        {post.date && (
          <time dateTime={new Date(post.date).toISOString()}>
            {new Date(post.date).toLocaleString()}
          </time>
        )}
      </div>
      <div className="post-body">
        <h2 className="post-title">{getPostTitle(post.content, t("untitledPost"))}</h2>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content ?? t("emptyPost")}
          </ReactMarkdown>
        </div>
        {post.image && <img src={post.image} alt={t("postAlt", { index: index + 1 })} />}
      </div>
      <a href={post.sourceUrl} target="_blank" rel="noreferrer">
        {post.sourceUrl}
      </a>
    </article>
  );
}