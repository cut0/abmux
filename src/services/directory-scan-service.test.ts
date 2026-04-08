import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { createDirectoryScanService, type DirectoryScanService } from "./directory-scan-service.ts";

describe("createDirectoryScanService", () => {
  let tempHome: string;
  let originalHome: string | undefined;
  let service: DirectoryScanService;

  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), "scan-test-"));
    originalHome = process.env["HOME"];
    process.env["HOME"] = tempHome;
    service = createDirectoryScanService();
  });

  afterEach(() => {
    process.env["HOME"] = originalHome;
    rmSync(tempHome, { recursive: true, force: true });
  });

  it(".git を持つディレクトリをプロジェクトとして検出する", async () => {
    mkdirSync(join(tempHome, "repos", "my-project", ".git"), { recursive: true });

    const result = await service.scan();
    expect(result).toEqual([join(tempHome, "repos", "my-project")]);
  });

  it("複数のプロジェクトをソート済みで返す", async () => {
    mkdirSync(join(tempHome, "repos", "beta", ".git"), { recursive: true });
    mkdirSync(join(tempHome, "repos", "alpha", ".git"), { recursive: true });

    const result = await service.scan();
    expect(result).toEqual([
      join(tempHome, "repos", "alpha"),
      join(tempHome, "repos", "beta"),
    ]);
  });

  it(".git がないディレクトリは検出しない", async () => {
    mkdirSync(join(tempHome, "repos", "not-a-project"), { recursive: true });

    const result = await service.scan();
    expect(result).toEqual([]);
  });

  it("node_modules 配下は探索しない", async () => {
    mkdirSync(join(tempHome, "node_modules", "pkg", ".git"), { recursive: true });

    const result = await service.scan();
    expect(result).toEqual([]);
  });

  it("隠しディレクトリは探索しない", async () => {
    mkdirSync(join(tempHome, ".hidden", "project", ".git"), { recursive: true });

    const result = await service.scan();
    expect(result).toEqual([]);
  });

  it("深い階層のプロジェクトも検出する", async () => {
    mkdirSync(join(tempHome, "a", "b", "c", "project", ".git"), { recursive: true });

    const result = await service.scan();
    expect(result).toEqual([join(tempHome, "a", "b", "c", "project")]);
  });

  it("HOME が未設定の場合は空配列を返す", async () => {
    process.env["HOME"] = "";

    const result = await service.scan();
    expect(result).toEqual([]);
  });
});
