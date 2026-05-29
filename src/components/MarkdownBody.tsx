import { useMemo } from "react";
import { renderSuggestionsMarkdown } from "../lib/markdown";

type MarkdownBodyProps = {
  source: string;
  className?: string;
};

export function MarkdownBody({ source, className = "out-tips md-body" }: MarkdownBodyProps) {
  const html = useMemo(() => renderSuggestionsMarkdown(source), [source]);
  if (!html) return <div className={className} />;
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
