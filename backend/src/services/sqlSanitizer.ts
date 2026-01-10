const BLOCKED_KEYWORDS = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "GRANT", "REVOKE"];

export interface SanitizedSql {
  sql: string;
  warnings: string[];
}

export function sanitizeSql(rawSql: string, defaultLimit = 50): SanitizedSql {
  let sql = rawSql.trim();
  const warnings: string[] = [];

  sql = stripCommentLines(sql);
  // Remove trailing semicolons and whitespace more aggressively
  sql = sql.replace(/;+\s*$/gm, "").trim();

  if (!sql.toUpperCase().startsWith("SELECT")) {
    throw new Error("Only SELECT statements are allowed");
  }

  if (hasMultipleStatements(sql)) {
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
  const cleaned = sql
    .replace(/'[^']*'/g, "") // Remove single-quoted strings
    .replace(/"[^"]*"/g, "") // Remove double-quoted strings
    .replace(/`[^`]*`/g, "") // Remove backtick-quoted strings (MySQL)
    .trim();
  
  // After removing trailing semicolons, any remaining semicolon indicates multiple statements
  // Check if there's a semicolon that's not at the very end (after trimming)
  const semicolonIndex = cleaned.indexOf(";");
  if (semicolonIndex === -1) {
    return false; // No semicolon found
  }
  
  // If semicolon exists and there's non-whitespace content after it, it's multiple statements
  const afterSemicolon = cleaned.substring(semicolonIndex + 1).trim();
  return afterSemicolon.length > 0;
}

function hasLimitClause(sql: string): boolean {
  return /\bLIMIT\s+\d+/i.test(sql);
}

function isAggregateQuery(sql: string): boolean {
  return /\bCOUNT\(|\bAVG\(|\bSUM\(|\bMIN\(|\bMAX\(/i.test(sql) || /\bGROUP\s+BY\b/i.test(sql);
}

