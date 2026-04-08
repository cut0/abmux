import { describe, it, expect } from "vitest";
import { escapeShellArg } from "./ShellUtils.ts";

describe("escapeShellArg", () => {
  it("通常の文字列はシングルクォートで囲んで返す", () => {
    expect(escapeShellArg("hello")).toBe("'hello'");
  });

  it("シングルクォートをエスケープする", () => {
    expect(escapeShellArg("it's")).toBe("'it'\\''s'");
  });

  it("ダブルクォートはそのまま保持される", () => {
    expect(escapeShellArg('say "hello"')).toBe("'say \"hello\"'");
  });

  it("バッククォートはそのまま保持される", () => {
    expect(escapeShellArg("run `cmd`")).toBe("'run `cmd`'");
  });

  it("$記号はそのまま保持される", () => {
    expect(escapeShellArg("$HOME")).toBe("'$HOME'");
  });

  it("空文字列を空のクォートで返す", () => {
    expect(escapeShellArg("")).toBe("''");
  });

  it("スペースを含む文字列を正しく囲む", () => {
    expect(escapeShellArg("hello world")).toBe("'hello world'");
  });

  it("複数のシングルクォートをエスケープする", () => {
    expect(escapeShellArg("it's a 'test'")).toBe("'it'\\''s a '\\''test'\\'''");
  });
});
