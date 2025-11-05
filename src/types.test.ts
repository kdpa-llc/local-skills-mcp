import { describe, it, expect } from "vitest";
import type { SkillMetadata, Skill } from "./types.js";

describe("types", () => {
  describe("SkillMetadata", () => {
    it("should allow valid metadata objects", () => {
      const metadata: SkillMetadata = {
        name: "test-skill",
        description: "A test skill",
      };

      expect(metadata.name).toBe("test-skill");
      expect(metadata.description).toBe("A test skill");
    });

    it("should require name field", () => {
      const metadata: SkillMetadata = {
        name: "required-name",
        description: "description",
      };

      expect(metadata.name).toBeDefined();
    });

    it("should require description field", () => {
      const metadata: SkillMetadata = {
        name: "name",
        description: "required-description",
      };

      expect(metadata.description).toBeDefined();
    });
  });

  describe("Skill", () => {
    it("should allow valid skill objects", () => {
      const skill: Skill = {
        name: "code-reviewer",
        description: "Reviews code for best practices",
        content: "Detailed skill instructions...",
        path: "/home/user/.claude/skills/code-reviewer",
        source: "/home/user/.claude/skills",
      };

      expect(skill.name).toBe("code-reviewer");
      expect(skill.description).toBe("Reviews code for best practices");
      expect(skill.content).toBe("Detailed skill instructions...");
      expect(skill.path).toBe("/home/user/.claude/skills/code-reviewer");
      expect(skill.source).toBe("/home/user/.claude/skills");
    });

    it("should extend SkillMetadata with additional fields", () => {
      const skill: Skill = {
        name: "test",
        description: "test description",
        content: "content",
        path: "/path",
        source: "/source",
      };

      // Skill should have all SkillMetadata fields
      const metadata: SkillMetadata = {
        name: skill.name,
        description: skill.description,
      };

      expect(metadata.name).toBe(skill.name);
      expect(metadata.description).toBe(skill.description);

      // Plus additional Skill-specific fields
      expect(skill.content).toBeDefined();
      expect(skill.path).toBeDefined();
      expect(skill.source).toBeDefined();
    });

    it("should support all required fields", () => {
      const skill: Skill = {
        name: "minimal-skill",
        description: "minimal description",
        content: "",
        path: "",
        source: "",
      };

      // All fields should be present even if empty
      expect(typeof skill.name).toBe("string");
      expect(typeof skill.description).toBe("string");
      expect(typeof skill.content).toBe("string");
      expect(typeof skill.path).toBe("string");
      expect(typeof skill.source).toBe("string");
    });

    it("should handle complex content", () => {
      const complexContent = `
# Skill Instructions

This is a multi-line skill with:
- Lists
- **Bold text**
- Code blocks

\`\`\`typescript
const example = "code";
\`\`\`
      `;

      const skill: Skill = {
        name: "complex-skill",
        description: "A skill with complex content",
        content: complexContent,
        path: "/skills/complex",
        source: "/skills",
      };

      expect(skill.content).toContain("# Skill Instructions");
      expect(skill.content).toContain("```typescript");
      expect(skill.content).toContain("**Bold text**");
    });

    it("should handle special characters in paths", () => {
      const skill: Skill = {
        name: "special-path-skill",
        description: "Skill with special path characters",
        content: "content",
        path: "/home/user/.claude/skills/my-skill",
        source: "/home/user/.claude/skills",
      };

      expect(skill.path).toContain(".claude");
      expect(skill.path).toContain("-");
      expect(skill.path).toContain("/");
    });
  });

  describe("Type compatibility", () => {
    it("should allow assigning SkillMetadata from Skill", () => {
      const skill: Skill = {
        name: "test-skill",
        description: "test description",
        content: "content",
        path: "/path",
        source: "/source",
      };

      // Should be able to use Skill where SkillMetadata is expected
      const metadata: SkillMetadata = skill;

      expect(metadata.name).toBe(skill.name);
      expect(metadata.description).toBe(skill.description);
    });

    it("should support array operations on Skill objects", () => {
      const skills: Skill[] = [
        {
          name: "skill1",
          description: "First skill",
          content: "content1",
          path: "/path1",
          source: "/source",
        },
        {
          name: "skill2",
          description: "Second skill",
          content: "content2",
          path: "/path2",
          source: "/source",
        },
      ];

      expect(skills).toHaveLength(2);
      expect(skills[0].name).toBe("skill1");
      expect(skills[1].name).toBe("skill2");

      const names = skills.map((s) => s.name);
      expect(names).toEqual(["skill1", "skill2"]);
    });

    it("should support Map operations with Skill type", () => {
      const skillMap = new Map<string, Skill>();

      const skill: Skill = {
        name: "mapped-skill",
        description: "Skill in map",
        content: "content",
        path: "/path",
        source: "/source",
      };

      skillMap.set("mapped-skill", skill);

      expect(skillMap.has("mapped-skill")).toBe(true);
      expect(skillMap.get("mapped-skill")).toEqual(skill);
      expect(skillMap.size).toBe(1);
    });
  });
});
