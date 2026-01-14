import axios from "axios";
import { env } from "../env.js";
import { buildPrompt, type PromptInput } from "./promptBuilder.js";
import { OUT_OF_SCOPE_MESSAGE } from "../constants/messages.js";

export interface OpenRouterResponse {
  sql: string;
  raw: unknown;
}

const headers: Record<string, string> = {
  Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json"
};

if (env.OPENROUTER_SITE_URL) {
  headers["HTTP-Referer"] = env.OPENROUTER_SITE_URL;
}

if (env.OPENROUTER_APP_NAME) {
  headers["X-Title"] = env.OPENROUTER_APP_NAME;
}

const client = axios.create({
  baseURL: env.OPENROUTER_API_URL,
  headers,
  timeout: 30_000
});

export async function generateSqlFromQuestion(payload: PromptInput): Promise<OpenRouterResponse> {
  const { systemPrompt, userPrompt } = buildPrompt(payload);

  try {
    const response = await client.post("", {
      model: env.OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 256
    });

    const sql = extractSql(response.data);
    
    // Check if the response is an out-of-scope message
    if (sql.includes(OUT_OF_SCOPE_MESSAGE) || sql.toLowerCase().includes("can only help with questions about the data")) {
      throw new Error(OUT_OF_SCOPE_MESSAGE);
    }
    
    // Validate that we got SQL back
    if (!sql || sql.trim().length === 0) {
      console.error("OpenRouter returned empty SQL. Response:", JSON.stringify(response.data, null, 2));
      throw new Error("OpenRouter returned empty SQL response. The model may have failed to generate SQL.");
    }

    return {
      sql,
      raw: response.data
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      const status = error.response?.status;
      
      // Try to extract detailed error information from various possible response structures
      let message = "Unknown error";
      
      if (responseData) {
        // OpenRouter error structure
        if (responseData.error) {
          if (typeof responseData.error === "string") {
            message = responseData.error;
          } else if (responseData.error.message) {
            message = responseData.error.message;
          } else if (responseData.error.code) {
            message = `${responseData.error.code}: ${responseData.error.message || "Provider returned error"}`;
          }
        }
        // Alternative error structures
        else if (responseData.message) {
          message = responseData.message;
        }
        // Log full response for debugging
        console.error("OpenRouter API error response:", {
          status,
          data: JSON.stringify(responseData, null, 2)
        });
      }
      
      // Include status code in error message
      const errorMessage = status 
        ? `OpenRouter request failed (${status}): ${message}`
        : `OpenRouter request failed: ${message}`;
      
      throw new Error(errorMessage);
    }

    throw error;
  }
}

function extractSql(data: any): string {
  const choice = data?.choices?.[0];
  const message = choice?.message;
  if (!message) return "";

  const content = message.content;

  let sql = "";
  
  if (typeof content === "string") {
    sql = content.trim();
  } else if (Array.isArray(content)) {
    sql = content
      .map((segment) => {
        if (typeof segment === "string") return segment;
        if (segment && typeof segment === "object" && "text" in segment) {
          return String(segment.text);
        }
        return "";
      })
      .join("");
    sql = sql.trim();
  } else {
    return "";
  }

  // Remove markdown code blocks if present (```sql ... ``` or ``` ... ```)
  sql = sql.replace(/^```[\w]*\n?/g, "").replace(/\n?```$/g, "").trim();
  
  // Remove any leading/trailing markdown formatting
  sql = sql.replace(/^`+/g, "").replace(/`+$/g, "").trim();
  
  // Remove LLM stop tokens and special markers ([/s], <|endoftext|>, etc.)
  sql = sql.replace(/\[\/s\]/g, "").trim();
  sql = sql.replace(/<\|endoftext\|>/g, "").trim();
  sql = sql.replace(/<\|stop\|>/g, "").trim();
  sql = sql.replace(/\[INST\]/g, "").trim();
  sql = sql.replace(/\[\/INST\]/g, "").trim();
  
  return sql;
}

