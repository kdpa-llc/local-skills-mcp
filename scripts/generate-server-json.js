#!/usr/bin/env node

/**
 * Generate server.json from package.json
 * This ensures version numbers stay in sync automatically
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

// Extract mcpName from package.json or use default
const mcpName = packageJson.mcpName || 'io.github.rkdpa/local-skills-mcp';

// Create server.json structure
const serverJson = {
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-10-17/server.schema.json",
  "name": mcpName,
  "description": packageJson.description || "Universal MCP server for local filesystem skills with lazy loading and context-efficient discovery",
  "version": packageJson.version,
  "packages": [
    {
      "registryType": "npm",
      "identifier": packageJson.name,
      "version": packageJson.version,
      "transport": {
        "type": "stdio"
      }
    }
  ]
};

// Write server.json
const serverJsonPath = join(__dirname, '..', 'server.json');
writeFileSync(
  serverJsonPath,
  JSON.stringify(serverJson, null, 2) + '\n',
  'utf8'
);

console.log(`✓ Generated server.json with version ${packageJson.version}`);
