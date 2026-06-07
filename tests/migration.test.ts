import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(join(process.cwd(), "prisma", "migrations", "20260608000000_init", "migration.sql"), "utf8");

describe("initial migration", () => {
  it("keeps database-level enum-like constraints", () => {
    expect(migrationSql).toContain('"type" TEXT NOT NULL CHECK');
    expect(migrationSql).toContain('"scope" TEXT NOT NULL CHECK');
    expect(migrationSql).toContain("CHECK (\"status\" IN");
    expect(migrationSql).toContain('"priority" TEXT NOT NULL DEFAULT');
  });

  it("provides a default updatedAt value for direct migrate deploy creates", () => {
    expect(migrationSql).toContain('"updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
  });
});
