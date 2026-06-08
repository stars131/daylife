import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(join(process.cwd(), "prisma", "migrations", "20260608000000_init", "migration.sql"), "utf8");
const gitAttributes = readFileSync(join(process.cwd(), ".gitattributes"), "utf8");
const dockerEntrypoint = readFileSync(join(process.cwd(), "docker-entrypoint.sh"), "utf8");
const eventDetailPage = readFileSync(join(process.cwd(), "app", "events", "[id]", "page.tsx"), "utf8");

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

  it("keeps docker shell entrypoints LF-only for Linux containers", () => {
    expect(gitAttributes).toContain("*.sh text eol=lf");
    expect(dockerEntrypoint).not.toContain("\r\n");
  });

  it("keeps event detail page copy readable", () => {
    expect(eventDetailPage).toContain("编辑事项");
  });
});
