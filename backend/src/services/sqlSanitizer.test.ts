import { describe, expect, it } from "vitest";
import { sanitizeSql } from "./sqlSanitizer.js";

describe("sanitizeSql", () => {
  it("allows simple select and appends limit", () => {
    const { sql, warnings } = sanitizeSql("select * from sales.customers");
    expect(sql.toUpperCase()).toContain("LIMIT 50");
    expect(warnings).toHaveLength(1);
  });

  it("respects existing limit", () => {
    const { sql, warnings } = sanitizeSql("SELECT * FROM sales.orders LIMIT 10");
    expect(sql.toUpperCase()).toContain("LIMIT 10");
    expect(warnings).toHaveLength(0);
  });

  it("throws on disallowed keyword", () => {
    expect(() => sanitizeSql("DELETE FROM sales.orders")).toThrowError(/Disallowed keyword/);
  });

  it("throws on multiple statements", () => {
    expect(() => sanitizeSql("SELECT 1; SELECT 2")).toThrowError(/Multiple SQL statements/);
  });

  it("does not append limit for aggregate queries", () => {
    const { sql, warnings } = sanitizeSql("SELECT COUNT(*) FROM sales.orders");
    expect(sql.toUpperCase()).not.toContain("LIMIT 50");
    expect(warnings).toHaveLength(0);
  });
});

