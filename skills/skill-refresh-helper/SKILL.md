---
name: skill-refresh-helper
description: Teaches the LLM about Local Skills MCP's full hot reload capabilities. All skill changes (new skills, content edits, deletions) apply immediately without restart. Use after creating or modifying skills.
---

You are an expert at managing the Local Skills MCP server's hot reload capabilities.

Your task is to help the LLM understand that all skill changes apply immediately - no restart needed for any changes to skills.

## Core Principle

Local Skills MCP supports **full hot reload** - skills are discovered dynamically every time the tool list is requested, and skill content is loaded fresh from disk on every use. No server restart is needed for any changes!

## When to Refresh the Tool List

**Refresh the tool list immediately after**:

1. Creating a new skill directory with SKILL.md
2. User asks to see available skills
3. User wants to verify a newly created skill appears
4. Before attempting to use a skill that was just created

**Skill content changes apply immediately**:

- Modifying existing skill content (loaded fresh on next use)
- Changing frontmatter description (refreshing tool list will show new description)
- All changes are reflected immediately without restart

## How Hot Reload Works

### What Happens on Tool List Request

When you (the LLM) request the list of available tools from Local Skills MCP:

1. **Discovery runs fresh**: `skill Loader.discoverSkills()` is called
2. **Registry clears**: Old skill registry is wiped clean
3. **Filesystem scanned**: All skill directories are re-scanned
4. **Registry rebuilt**: Current state of filesystem becomes new registry
5. **Tool list returned**: Includes all currently available skills

This means: **The tool list always reflects the current filesystem state**!

### What's Cached

- **Nothing is cached!** All data is loaded fresh:
  - Skill content: Read from disk on every `get_skill` call
  - Metadata: Read from disk on every access
  - Discovery: Scans filesystem on every tool list request

### Implications for You (the LLM)

- **After creating a skill**: Request the tool list again to see it
- **After modifying content**: Changes apply immediately on next use!
- **After adding/removing skills**: Request the tool list to see changes
- **Full hot reload**: No restarts needed for any changes

## Refreshing the Tool List

### Method: Request Available Tools

The MCP protocol provides a way to request the current list of available tools. In Claude's interface, this typically happens when:

- You ask "what tools are available?"
- You reference the tools in conversation
- The system periodically refreshes its tool knowledge

### For You (the LLM)

After creating a new skill, you should:

1. **Confirm creation**: "Created `skill-name` in `~/.claude/skills/`"
2. **Explain hot reload**: "The skill is now available - Local Skills MCP supports hot reload!"
3. **Demonstrate awareness**: Mention the skill as now available
4. **Optional verification**: Ask user if they'd like you to list all available skills to verify

### Example Flow

**User**: "Create a Python expert skill for me"

**You (LLM) do**:

1. Create `~/.claude/skills/python-expert/SKILL.md`
2. Write the skill content
3. Respond: "✅ Created python-expert skill in ~/.claude/skills/

   **The skill is immediately available!** Local Skills MCP supports hot reload for new skills - no restart needed. The python-expert skill will appear in my available tools as soon as I refresh my tool list.

   Would you like me to verify it's available or would you like to start using it right away?"

**NOT** ❌: "Created skill. Please restart your MCP client to use it."

## Best Practices

### DO ✅

- Explain that skills are immediately available
- Mention hot reload capability when creating skills
- Be confident that the skill can be used right away
- Reference the newly created skill as available

### DON'T ❌

- Tell users to restart the MCP server for new skills
- Say skills require a restart to appear
- Suggest that hot reload doesn't work
- Be uncertain about skill availability after creation

## Common Scenarios

### Scenario 1: Creating a New Skill

```
User: Create a code reviewer skill

You: ✅ Created code-reviewer skill in ~/.claude/skills/

The skill is immediately available thanks to hot reload!
You can start using it right away - no restart needed.
Would you like to try it out?
```

### Scenario 2: Modifying Existing Skill Content

```
User: Update the code-reviewer skill to be more strict

You: ✅ I've updated the code-reviewer skill content in ~/.claude/skills/code-reviewer/SKILL.md

The changes will take effect immediately! The next time the skill is loaded,
it will read the updated content from disk. No restart needed thanks to full
hot reload support.

Would you like me to use the updated skill now to review some code?
```

### Scenario 3: User Asks "Is the Skill Available?"

```
User: Can I use the python-expert skill now?

You: Yes! The python-expert skill is immediately available. Local Skills MCP
discovers skills dynamically - as soon as the skill file exists, it's ready
to use. No restart needed for new skills!

Would you like me to use it to help with your Python code?
```

## Technical Details for Context

### Code Reference

From `src/index.ts`:

```typescript
this.server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Discover skills EVERY TIME tools are requested
  const skillNames = await this.skillLoader.discoverSkills();
  // ... build tool list with current skills
});
```

From `src/skill-loader.ts`:

```typescript
async discoverSkills(): Promise<string[]> {
  this.skillRegistry.clear();  // Clear old registry
  // Re-scan all directories...
  // Rebuild registry with current filesystem state
}

async loadSkill(skillName: string): Promise<Skill> {
  // NO CACHE CHECK - always reads fresh from disk
  const fileContent = await fs.readFile(skillFilePath, "utf-8");
  const { metadata, content } = this.parseSkillFile(fileContent);
  return skill;  // Returns fresh data every time
}
```

This proves: **Skills ARE discovered AND loaded fresh every time!**

## Summary

**Key Message**: Local Skills MCP supports **full hot reload** for ALL changes. Everything updates immediately - no restart needed!

**Your Role**: After creating or modifying skills, be confident they're available and explain the hot reload capability to users. This improves the user experience dramatically compared to requiring restarts.

**Remember**:

- New skills: ✅ Hot reload (immediate)
- Content changes: ✅ Hot reload (immediate)
- Description changes: ✅ Hot reload (immediate)
- Deletions: ✅ Hot reload (immediate)
