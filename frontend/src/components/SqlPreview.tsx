import { clsx } from "clsx";
import { useState } from "react";

interface SqlPreviewProps {
  sql: string;
}

export function SqlPreview({ sql }: SqlPreviewProps): JSX.Element {
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!sql) return <></>;

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy SQL", error);
    }
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 shadow-xl shadow-indigo-500/10">
      <button
        type="button"
        onClick={() => setVisible((state) => !state)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-white"
      >
        <span>SQL Preview</span>
        <span className="text-xs text-cyan-200/80">{visible ? "Hide" : "Show"}</span>
      </button>
      <pre
        className={clsx(
          "overflow-x-auto px-4 pb-4 text-sm text-cyan-100",
          visible ? "block" : "hidden"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Generated SQL
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-white/20"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <code>{sql}</code>
      </pre>
    </div>
  );
}

