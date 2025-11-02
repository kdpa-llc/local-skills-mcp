import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import { Skill, SkillMetadata } from './types.js';

export class SkillLoader {
  private skillsPaths: string[];
  private skillCache = new Map<string, Skill>();
  private skillRegistry = new Map<string, { path: string; source: string }>();

  constructor(skillsPaths: string[]) {
    this.skillsPaths = skillsPaths;
  }

  /**
   * Parse SKILL.md file with YAML frontmatter
   */
  private parseSkillFile(content: string): { metadata: SkillMetadata; content: string } {
    // Check if file starts with frontmatter delimiter
    if (!content.startsWith('---\n')) {
      throw new Error('SKILL.md must start with YAML frontmatter (---)');
    }

    // Find the closing delimiter
    const endDelimiterIndex = content.indexOf('\n---\n', 4);
    if (endDelimiterIndex === -1) {
      throw new Error('SKILL.md frontmatter must end with --- delimiter');
    }

    // Extract and parse YAML frontmatter
    const frontmatterText = content.substring(4, endDelimiterIndex);
    const metadata = YAML.parse(frontmatterText) as SkillMetadata;

    // Validate required fields
    if (!metadata.name) {
      throw new Error('SKILL.md frontmatter must include "name" field');
    }
    if (!metadata.description) {
      throw new Error('SKILL.md frontmatter must include "description" field');
    }

    // Extract content after frontmatter
    const skillContent = content.substring(endDelimiterIndex + 5).trim();

    return { metadata, content: skillContent };
  }

  /**
   * Discover all available skills aggregated from all directories
   */
  async discoverSkills(): Promise<string[]> {
    this.skillRegistry.clear();
    const allSkills = new Map<string, { path: string; source: string }>();

    // Iterate through all skill directories
    for (const skillsPath of this.skillsPaths) {
      try {
        const entries = await fs.readdir(skillsPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillPath = path.join(skillsPath, entry.name);
            const skillFilePath = path.join(skillPath, 'SKILL.md');

            try {
              await fs.access(skillFilePath);
              // Later directories override earlier ones for duplicate names
              allSkills.set(entry.name, {
                path: skillPath,
                source: skillsPath
              });
            } catch {
              // Skip directories without SKILL.md
              continue;
            }
          }
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          console.error(`Error reading directory ${skillsPath}:`, error);
        }
        // Continue with other directories even if one fails
        continue;
      }
    }

    // Update registry
    this.skillRegistry = allSkills;

    // Return sorted skill names
    return Array.from(allSkills.keys()).sort();
  }

  /**
   * Load a specific skill by name (lazy loading)
   */
  async loadSkill(skillName: string): Promise<Skill> {
    // Check cache first
    if (this.skillCache.has(skillName)) {
      return this.skillCache.get(skillName)!;
    }

    // Get skill location from registry
    const skillInfo = this.skillRegistry.get(skillName);
    if (!skillInfo) {
      throw new Error(`Skill "${skillName}" not found. Run list_skills to see available skills.`);
    }

    const skillFilePath = path.join(skillInfo.path, 'SKILL.md');

    try {
      // Load and parse SKILL.md
      const fileContent = await fs.readFile(skillFilePath, 'utf-8');
      const { metadata, content } = this.parseSkillFile(fileContent);

      const skill: Skill = {
        name: metadata.name,
        description: metadata.description,
        content,
        path: skillInfo.path,
        source: skillInfo.source
      };

      // Cache the skill
      this.skillCache.set(skillName, skill);

      return skill;
    } catch (error) {
      throw new Error(`Failed to load skill "${skillName}": ${(error as Error).message}`);
    }
  }

  /**
   * Get skill metadata without loading the full content (for listing)
   */
  async getSkillMetadata(skillName: string): Promise<SkillMetadata & { source: string }> {
    const skillInfo = this.skillRegistry.get(skillName);
    if (!skillInfo) {
      throw new Error(`Skill "${skillName}" not found`);
    }

    const skillFilePath = path.join(skillInfo.path, 'SKILL.md');

    try {
      const fileContent = await fs.readFile(skillFilePath, 'utf-8');
      const { metadata } = this.parseSkillFile(fileContent);
      return {
        ...metadata,
        source: skillInfo.source
      };
    } catch (error) {
      throw new Error(`Failed to load metadata for skill "${skillName}": ${(error as Error).message}`);
    }
  }

  /**
   * Get all skills directories being monitored
   */
  getSkillsPaths(): string[] {
    return this.skillsPaths;
  }
}
