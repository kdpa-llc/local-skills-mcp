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
  name: string; // Directory name — the key that get_skill accepts
  title: string; // Display name from YAML frontmatter, may differ from name
  description: string;
  content: string;
  path: string;
  source: string; // Which directory the skill came from
}
