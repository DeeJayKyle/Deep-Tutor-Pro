import React from 'react';
import { inlineRuns, outline, parseMarkdown } from '../lib/markdown';

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineRuns(text).map((r, i) => {
        if (r.bold) return <strong key={i}>{r.text}</strong>;
        if (r.italic) return <em key={i}>{r.text}</em>;
        if (r.code) return <code key={i}>{r.text}</code>;
        if (r.source)
          return (
            <span key={i} className="src-tag" title="Taken from one of your uploaded references">
              {r.text}
            </span>
          );
        if (r.link)
          return r.link.startsWith('#') ? (
            <a key={i} href={r.link}>
              {r.text}
            </a>
          ) : (
            <a key={i} href={r.link} target="_blank" rel="noopener noreferrer">
              {r.text}
            </a>
          );
        return <React.Fragment key={i}>{r.text}</React.Fragment>;
      })}
    </>
  );
}

/** Renders Markdown safely (no raw HTML). Headings get ids for in-page links. */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const slugs = outline(source).map((h) => h.slug);
  let h = 0;
  return (
    <div className={`prose-dt ${className ?? ''}`}>
      {parseMarkdown(source).map((b, i) => {
        switch (b.type) {
          case 'heading': {
            const Tag = `h${b.level}` as 'h1';
            return (
              <Tag key={i} id={`sec-${slugs[h++]}`}>
                <Inline text={b.text} />
              </Tag>
            );
          }
          case 'para':
            return (
              <p key={i}>
                <Inline text={b.text} />
              </p>
            );
          case 'list': {
            const Tag = b.ordered ? 'ol' : 'ul';
            return (
              <Tag key={i}>
                {b.items.map((it, j) => (
                  <li key={j} style={{ marginLeft: `${it.depth * 1.2}em` }}>
                    <Inline text={it.text} />
                  </li>
                ))}
              </Tag>
            );
          }
          case 'table': {
            const [head, ...rows] = b.rows;
            return (
              <div key={i} className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      {head.map((c, j) => (
                        <th key={j}>
                          <Inline text={c} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k}>
                            <Inline text={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case 'quote':
            return (
              <blockquote key={i}>
                <Inline text={b.text} />
              </blockquote>
            );
          case 'code':
            return (
              <pre key={i}>
                <code>{b.text}</code>
              </pre>
            );
          case 'hr':
            return <hr key={i} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

/** Table of contents with links to each heading of the rendered document. */
export function Toc({ source, onJump }: { source: string; onJump?: () => void }) {
  const items = outline(source).filter((x) => x.level <= 3);
  if (items.length < 2) return null;
  return (
    <nav aria-label="Contents" className="space-y-0.5 text-sm">
      {items.map((x) => (
        <button
          key={x.slug}
          onClick={() => {
            document.getElementById(`sec-${x.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            onJump?.();
          }}
          className="block min-h-6 w-full truncate py-0.5 text-left text-muted hover:text-accent"
          style={{ paddingLeft: `${(x.level - 1) * 0.75}rem` }}
        >
          {x.text}
        </button>
      ))}
    </nav>
  );
}
