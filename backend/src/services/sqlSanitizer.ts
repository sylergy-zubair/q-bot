const BLOCKED_KEYWORDS = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "GRANT", "REVOKE"];

export interface SanitizedSql {
  sql: string;
  warnings: string[];
}

export function sanitizeSql(rawSql: string, defaultLimit = 50): SanitizedSql {
  let sql = rawSql.trim();
  const warnings: string[] = [];

  // Remove markdown code blocks if present (```sql ... ```)
  sql = sql.replace(/^```[\w]*\n?/g, "").replace(/\n?```$/g, "").trim();
  
  // Remove LLM stop tokens and special markers ([/s], <|endoftext|>, etc.)
  sql = sql.replace(/\[\/s\]/g, "").trim();
  sql = sql.replace(/<\|endoftext\|>/g, "").trim();
  sql = sql.replace(/<\|stop\|>/g, "").trim();
  sql = sql.replace(/\[INST\]/g, "").trim();
  sql = sql.replace(/\[\/INST\]/g, "").trim();
  
  sql = stripCommentLines(sql);
  // Remove trailing semicolons and whitespace more aggressively (including across newlines)
  sql = sql.replace(/;+\s*$/gm, "").trim(); // Remove from end of lines
  sql = sql.replace(/;+\s*$/, "").trim();   // Remove from end of entire string

  // Log for debugging
  console.log("After initial cleanup, SQL length:", sql.length);
  console.log("After initial cleanup (first 200 chars):", sql.substring(0, 200));

  if (!sql.toUpperCase().startsWith("SELECT")) {
    throw new Error("Only SELECT statements are allowed");
  }

  if (hasMultipleStatements(sql)) {
    // Log the SQL that triggered the error
    console.error("Multiple statements detected. SQL:", JSON.stringify(sql));
    console.error("SQL length:", sql.length);
    throw new Error("Multiple SQL statements detected");
  }

  const upper = sql.toUpperCase();
  for (const keyword of BLOCKED_KEYWORDS) {
    if (upper.includes(`${keyword} `) || upper.includes(` ${keyword}`)) {
      throw new Error(`Disallowed keyword detected: ${keyword}`);
    }
  }

  if (!hasLimitClause(sql) && !isAggregateQuery(sql)) {
    sql = `${sql}\nLIMIT ${defaultLimit}`;
    warnings.push(`LIMIT ${defaultLimit} appended automatically.`);
  }

  return { sql, warnings };
}

function stripCommentLines(sql: string): string {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

function hasMultipleStatements(sql: string): boolean {
  // Remove string literals to avoid false positives from semicolons in strings
  // Use a more robust approach that handles escaped quotes
  let cleaned = sql;
  
  // Remove string literals (handling escaped quotes)
  cleaned = cleaned.replace(/'([^'\\]|\\.)*'/g, ""); // Single-quoted strings with escapes
  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, ""); // Double-quoted strings with escapes
  cleaned = cleaned.replace(/`([^`\\]|\\.)*`/g, ""); // Backtick-quoted strings with escapes
  cleaned = cleaned.trim();
  
  // Remove LLM stop tokens and markers before checking for semicolons
  cleaned = cleaned.replace(/\[\/s\]/g, "").trim();
  cleaned = cleaned.replace(/<\|endoftext\|>/g, "").trim();
  cleaned = cleaned.replace(/<\|stop\|>/g, "").trim();
  cleaned = cleaned.replace(/\[INST\]/g, "").trim();
  cleaned = cleaned.replace(/\[\/INST\]/g, "").trim();
  
  // Remove trailing semicolons one more time after string removal
  cleaned = cleaned.replace(/;+\s*$/gm, "").trim();
  cleaned = cleaned.replace(/;+\s*$/, "").trim();
  
  // Also remove any trailing semicolons followed by whitespace/newlines or tokens
  cleaned = cleaned.replace(/;+[\s\n\r\[\]\/a-z|<>]*$/i, "").trim();
  
  // After removing trailing semicolons, any remaining semicolon indicates multiple statements
  const semicolonIndex = cleaned.indexOf(";");
  if (semicolonIndex === -1) {
    return false; // No semicolon found
  }
  
  // If semicolon exists and there's non-whitespace content after it, it's multiple statements
  const afterSemicolon = cleaned.substring(semicolonIndex + 1).trim();
  const hasMultiple = afterSemicolon.length > 0;
  
  if (hasMultiple) {
    console.error("Multiple statements detected. After semicolon:", JSON.stringify(afterSemicolon.substring(0, 100)));
  }
  
  return hasMultiple;
}

function hasLimitClause(sql: string): boolean {
  return /\bLIMIT\s+\d+/i.test(sql);
}

function isAggregateQuery(sql: string): boolean {
  return /\bCOUNT\(|\bAVG\(|\bSUM\(|\bMIN\(|\bMAX\(/i.test(sql) || /\bGROUP\s+BY\b/i.test(sql);
}

