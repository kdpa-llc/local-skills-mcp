/**
 * Skill metadata from YAML frontmatter in SKILL.md
 */
export interface SkillMetadata {
  name: string;
  description: string;
}

/**
 * Full skill definition including prompt content
 */
export interface Skill {
  name: string;
  description: string;
  content: string;
  path: string;
  source: string; // Which directory the skill came from
}
