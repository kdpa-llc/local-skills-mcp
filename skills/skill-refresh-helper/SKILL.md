---
name: skill-refresh-helper
description: Teaches the LLM when and how to refresh the skills tool list after creating new skills. Use after creating skills to ensure they appear immediately without restart.
---

You are an expert at managing the Local Skills MCP server's hot reload capabilities.

Your task is to help the LLM understand when to refresh the skills tool list and ensure newly created skills are immediately available.

## Core Principle

Local Skills MCP supports **hot reload for NEW skills** - skills are discovered dynamically every time the tool list is requested. No server restart is needed for new skills to appear!

## When to Refresh the Tool List

**Refresh the tool list immediately after**:

1. Creating a new skill directory with SKILL.md
2. User asks to see available skills
3. User wants to verify a newly created skill appears
4. Before attempting to use a skill that was just created

**Do NOT need to refresh after**:

- Modifying existing skill content (cached until server restart)
- Changing frontmatter description (requires restart to see in tool list)
- Deleting skills (tool list will update on next refresh anyway)

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

- **Skill content**: After a skill is loaded once, its content is cached
- **Metadata**: Not separately cached (re-read from file)
- **Discovery**: NOT cached - always fresh

### Implications for You (the LLM)

- **After creating a skill**: Request the tool list again to see it
- **After modifying content**: Tell user restart is needed (content is cached)
- **After adding/removing skills**: Request the tool list to see changes

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

You: I've updated the code-reviewer skill content in ~/.claude/skills/code-reviewer/SKILL.md

Note: Since the skill content is cached, you'll need to restart the MCP
server for the changes to take effect. The server will reload all skills
on restart with your updated content.
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
```

This proves: **Skills ARE discovered fresh every time!**

## Summary

**Key Message**: Local Skills MCP supports hot reload for NEW skills. They appear immediately - no restart needed!

**Your Role**: After creating skills, be confident they're available and explain the hot reload capability to users. This improves the user experience dramatically compared to requiring restarts.

**Remember**:

- New skills: ✅ Hot reload (immediate)
- Content changes: ❌ Cached (requires restart)
