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
  "Output only SQL with no prose, EXCEPT when the question is outside the scope of the provided database schema.",
  "If the question cannot be answered using the provided schema, respond with ONLY this exact message (no SQL): 'I can only help with questions about the data in this database. Could you please rephrase your question to focus on the available data?'",
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
    "Scope and Boundaries:",
    "You must ONLY answer questions related to the database schema provided. This system is designed to query the specific analytics database described in the schema.",
    "If a question is outside the scope of this database (e.g., general knowledge, unrelated topics, or questions about data not in the schema), you must politely decline by responding with:",
    "'I can only help with questions about the data available to me. Could you please rephrase your question to focus on the available data?'",
    "Do not attempt to answer questions that cannot be answered using the provided schema.",
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

