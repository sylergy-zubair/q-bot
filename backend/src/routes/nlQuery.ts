import type { Request, Response } from "express";
import { z } from "zod";
import { getSchemaMetadata } from "../db/schema.js";
import { executeSelectQuery } from "../db/query.js";
import { generateSqlFromQuestion } from "../services/openRouterClient.js";
import { formatSchemaForPrompt } from "../services/schemaFormatter.js";
import { sanitizeSql } from "../services/sqlSanitizer.js";

const bodySchema = z.object({
  question: z.string().min(3, "Question must be at least 3 characters long")
});

export async function nlQueryHandler(req: Request, res: Response): Promise<void> {
  const parsed = bodySchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request", issues: parsed.error.issues });
    return;
  }

  try {
    const schema = await getSchemaMetadata();
    const formattedSchema = formatSchemaForPrompt(schema);

    const hfResponse = await generateSqlFromQuestion({
      question: parsed.data.question,
      schema: formattedSchema
    });

    const sanitized = sanitizeSql(hfResponse.sql);
    const execution = await executeSelectQuery(sanitized.sql);

    res.json({
      sql: sanitized.sql,
      warnings: sanitized.warnings,
      result: execution
    });
  } catch (error) {
    console.error("Failed to generate or execute SQL", error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isOpenRouterError = errorMessage.includes("OpenRouter");
    
    res.status(500).json({ 
      message: "Failed to generate or execute SQL",
      error: errorMessage,
      type: isOpenRouterError ? "api_error" : "execution_error"
    });
  }
}

