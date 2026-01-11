import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import path from "path";
import fs from "fs";
import os from "os";
import { getAllSkillsDirectories } from "./index.js";

describe("getAllSkillsDirectories", () => {
  const originalEnv = process.env;
  const mockCwd = "/app";
  const mockHome = "/home/user";

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.spyOn(process, "cwd").mockReturnValue(mockCwd);
    vi.spyOn(os, "homedir").mockReturnValue(mockHome);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should include package skills if they exist", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((pathStr) => {
      if (
        typeof pathStr === "string" &&
        pathStr.endsWith("skills") &&
        !pathStr.includes(".claude")
      ) {
        // Return true for everything that looks like skills
        return true;
      }
      return false;
    });

    const dirs = getAllSkillsDirectories();

    // Should be at least 1 (package skills), possibly 2 (default skills)
    expect(dirs.length).toBeGreaterThan(0);
    expect(dirs.some((d) => d.endsWith("skills"))).toBe(true);
  });

  it("should include home claude skills if they exist", () => {
    const homeSkills = path.join(mockHome, ".claude", "skills");

    vi.spyOn(fs, "existsSync").mockImplementation((pathStr) => {
      return pathStr === homeSkills;
    });

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(homeSkills);
  });

  it("should include project claude skills if they exist", () => {
    const projectClaudeSkills = path.join(mockCwd, ".claude", "skills");

    vi.spyOn(fs, "existsSync").mockImplementation((pathStr) => {
      return pathStr === projectClaudeSkills;
    });

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(projectClaudeSkills);
  });

  it("should include default project skills if they exist", () => {
    const defaultSkills = path.join(mockCwd, "skills");

    vi.spyOn(fs, "existsSync").mockImplementation((pathStr) => {
      return pathStr === defaultSkills;
    });

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(defaultSkills);
  });

  it("should include SKILLS_DIR if set", () => {
    const customDir = "/custom/skills";
    process.env.SKILLS_DIR = customDir;

    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const dirs = getAllSkillsDirectories();
    expect(dirs).toContain(customDir);
  });

  it("should include all directories that exist", () => {
    process.env.SKILLS_DIR = "/custom/skills";

    vi.spyOn(fs, "existsSync").mockImplementation(() => {
      return true;
    });

    const dirs = getAllSkillsDirectories();
    // 4 standard checks + 1 env var
    expect(dirs.length).toBe(5);
  });
});
