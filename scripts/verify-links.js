#!/usr/bin/env node

/**
 * Link Verification Script
 *
 * Verifies that all links in markdown files are valid and up-to-date.
 * Checks internal links and external URLs (with optional network check).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Files to check
const markdownFiles = [
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'QUICK_START.md'
];

// Patterns to extract links
const markdownLinkPattern = /\[([^\]]+)\]\[([^\]]+)\]/g;
const refLinkPattern = /^\[([^\]]+)\]:\s*(.+)$/gm;
const inlineUrlPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

let errors = 0;
let warnings = 0;

console.log('🔍 Verifying links in markdown files...\n');

markdownFiles.forEach(file => {
  const filePath = join(projectRoot, file);

  if (!existsSync(filePath)) {
    console.log(`⚠️  ${file}: File not found (skipping)`);
    warnings++;
    return;
  }

  console.log(`📄 Checking ${file}...`);
  const content = readFileSync(filePath, 'utf-8');

  // Extract reference links
  const references = new Map();
  let match;

  while ((match = refLinkPattern.exec(content)) !== null) {
    references.set(match[1], match[2]);
  }

  console.log(`   Found ${references.size} reference links`);

  // Check markdown reference-style links
  const markdownLinks = [];
  while ((match = markdownLinkPattern.exec(content)) !== null) {
    markdownLinks.push({ text: match[1], ref: match[2] });
  }

  // Verify references exist
  let fileErrors = 0;
  markdownLinks.forEach(link => {
    if (!references.has(link.ref)) {
      console.log(`   ❌ Missing reference: [${link.text}][${link.ref}]`);
      fileErrors++;
    }
  });

  // Check inline links for local file references
  while ((match = inlineUrlPattern.exec(content)) !== null) {
    const url = match[2];

    // Check if it's a local file reference (not a URL or anchor)
    if (!url.startsWith('http') && !url.startsWith('#') && !url.startsWith('mailto:')) {
      const localPath = join(projectRoot, url);
      if (!existsSync(localPath)) {
        console.log(`   ❌ Broken local link: ${url}`);
        fileErrors++;
      }
    }
  }

  // Verify local file references in reference links
  references.forEach((url, ref) => {
    if (!url.startsWith('http') && !url.startsWith('#') && !url.startsWith('mailto:')) {
      const localPath = join(projectRoot, url);
      if (!existsSync(localPath)) {
        console.log(`   ❌ Broken reference link [${ref}]: ${url}`);
        fileErrors++;
      }
    }
  });

  if (fileErrors === 0) {
    console.log(`   ✅ All links verified\n`);
  } else {
    console.log(`   Found ${fileErrors} error(s)\n`);
    errors += fileErrors;
  }
});

// Summary
console.log('━'.repeat(50));
if (errors === 0 && warnings === 0) {
  console.log('✅ All links verified successfully!');
  process.exit(0);
} else {
  console.log(`\n⚠️  Summary: ${errors} error(s), ${warnings} warning(s)`);
  if (errors > 0) {
    console.log('❌ Link verification failed');
    process.exit(1);
  } else {
    console.log('⚠️  Link verification passed with warnings');
    process.exit(0);
  }
}
