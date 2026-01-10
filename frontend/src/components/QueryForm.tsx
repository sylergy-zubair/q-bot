import { useState } from "react";

interface QueryFormProps {
  onSubmit: (question: string) => Promise<void> | void;
  disabled?: boolean;
}

export function QueryForm({ onSubmit, disabled = false }: QueryFormProps): JSX.Element {
  const [question, setQuestion] = useState("");
  const suggestions = [
    "Show monthly revenue trends for the past year.",
    "List the top 10 menu items by revenue including category."
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!question.trim()) return;
    await onSubmit(question.trim());
  }

  function handleSuggestionClick(value: string): void {
    setQuestion(value);
  }

  const characters = question.length;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl bg-white/10 p-6 shadow-xl shadow-sky-500/10 backdrop-blur"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          Intelligent Prompt
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">
          Ask in natural language, get production-grade SQL
        </h2>
      </div>

      <div className="space-y-3">
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. Compare revenue by store for the last three months including growth rate."
          className="w-full min-h-[140px] rounded-2xl border border-white/20 bg-white/20 px-4 py-3 text-base text-white placeholder:text-white/60 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/70">
          <span>{characters} characters</span>
          <span>Need inspiration? Try one of the featured prompts below.</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => handleSuggestionClick(sample)}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white transition hover:bg-white/20"
          >
            {sample}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={disabled || question.trim().length < 3}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/40 transition hover:scale-[1.01] hover:shadow-fuchsia-500/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Fetch Answer
        </button>
        <p className="text-xs text-white/70">
          Powered by Agent Q + PostgreSQL. Queries run live against the `sale` schema.
        </p>
      </div>
    </form>
  );
}

