import type { Request, Response } from "express";
import { z } from "zod";
import { getSchemaMetadata } from "../db/schema.js";
import { executeSelectQuery } from "../db/query.js";
import { generateSqlFromQuestion } from "../services/openRouterClient.js";
import { formatSchemaForPrompt } from "../services/schemaFormatter.js";
import { sanitizeSql } from "../services/sqlSanitizer.js";
import { generateInsights } from "../services/insightGenerator.js";
import { OUT_OF_SCOPE_MESSAGE } from "../constants/messages.js";

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

        // Log the raw SQL for debugging
        console.log("Raw SQL from OpenRouter:", JSON.stringify(hfResponse.sql));
        console.log("Raw SQL length:", hfResponse.sql.length);
        console.log("Raw SQL (first 200 chars):", hfResponse.sql.substring(0, 200));

        const sanitized = sanitizeSql(hfResponse.sql);
    const execution = await executeSelectQuery(sanitized.sql);

    // Generate insights (async, non-blocking)
    let insights = null;
    try {
      insights = await generateInsights(parsed.data.question, execution);
    } catch (insightError) {
      console.error("Failed to generate insights:", insightError);
      // Continue without insights - don't fail the request
    }

    res.json({
      sql: sanitized.sql,
      warnings: sanitized.warnings,
      result: execution,
      insights: insights
    });
  } catch (error) {
    console.error("Failed to generate or execute SQL", error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isOpenRouterError = errorMessage.includes("OpenRouter");
    const isOutOfScope = errorMessage.includes(OUT_OF_SCOPE_MESSAGE) || errorMessage.toLowerCase().includes("can only help with questions about the data");
    
    // Handle out-of-scope questions with a user-friendly response
    if (isOutOfScope) {
      res.status(400).json({ 
        message: errorMessage,
        error: errorMessage,
        type: "out_of_scope"
      });
      return;
    }
    
    res.status(500).json({ 
      message: "Failed to generate or execute SQL",
      error: errorMessage,
      type: isOpenRouterError ? "api_error" : "execution_error"
    });
  }
}

