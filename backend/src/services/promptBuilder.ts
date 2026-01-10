export interface PromptInput {
  question: string;
  schema: string;
  conversation?: string[];
}

export interface PromptOutput {
  systemPrompt: string;
  userPrompt: string;
}

const RULES = [
  "Output only SQL with no prose.",
  "Use fully qualified table names (schema.table).",
  "Only generate SELECT queries.",
  "Avoid cartesian products; always join on keys.",
  "Include LIMIT 50 unless aggregation makes it unnecessary.",
  "If the question requests a time range or filter, translate it explicitly."
];

export function buildPrompt({ question, schema, conversation }: PromptInput): PromptOutput {
  const systemPrompt = [
    "You are an assistant that writes safe, syntactically correct PostgreSQL queries.",
    "Given the database schema and optional conversation history, respond with a single SQL statement that best answers the question.",
    "",
    "Rules:",
    RULES.map((rule, idx) => `${idx + 1}. ${rule}`).join("\n")
  ].join("\n");

  const historyLines = renderHistory(conversation);

  const userPromptParts = [
    "Schema overview:",
    schema,
    ""
  ];

  if (historyLines.length) {
    userPromptParts.push("Conversation history:", ...historyLines, "");
  }

  userPromptParts.push(`Question: ${question}`, "SQL:");

  const userPrompt = userPromptParts.filter((part) => part !== undefined && part !== "").join("\n");

  return { systemPrompt, userPrompt };
}

function renderHistory(conversation?: string[]): string[] {
  if (!conversation?.length) {
    return [];
  }

  return conversation.map((turn, idx) => `Turn ${idx + 1}: ${turn}`);
}

