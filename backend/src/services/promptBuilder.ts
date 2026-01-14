import { OUT_OF_SCOPE_MESSAGE } from "../constants/messages.js";

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
  "Output only SQL with no prose, EXCEPT when the question is clearly outside the scope of the provided database schema.",
  `If the question cannot be answered using the provided schema, respond with ONLY this exact message (no SQL): '${OUT_OF_SCOPE_MESSAGE}'`,
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
    "",
    "Questions that ARE in scope include:",
    "- Revenue, sales, orders, and financial metrics (e.g., total revenue, revenue by store, revenue trends)",
    "- Store performance, locations, and comparisons (e.g., which store has highest revenue, store comparisons)",
    "- Time-based analysis (e.g., monthly trends, week-over-week changes, seasonal patterns)",
    "- Menu items, categories, and product performance (e.g., top items, category breakdowns)",
    "- Customer behavior, channels, and payment methods (e.g., channel mix, payment preferences)",
    "- Any question that can be answered using the tables and columns in the provided schema",
    "",
    "Questions that are OUT of scope include:",
    "- General knowledge or questions not about the database (e.g., 'What is the capital of France?')",
    "- Questions about other databases or systems not in the schema",
    "- Questions that cannot be answered with the provided schema",
    "",
    "IMPORTANT: If a question can be answered using the schema (even if it requires aggregation, joins, or date functions), you MUST generate SQL. Only decline if the question is completely unrelated to the database.",
    "",
    "If a question is clearly outside the scope, you must politely decline by responding with:",
    `'${OUT_OF_SCOPE_MESSAGE}'`,
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

