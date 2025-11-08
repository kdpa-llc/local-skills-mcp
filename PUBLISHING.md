# Publishing Guide

This guide explains how to publish `local-skills-mcp` to npm and the MCP Registry using automated workflows with OIDC trusted publishing.

## Overview

This package uses **npm trusted publishing with OIDC** for secure, token-less publishing via GitHub Actions. This eliminates the need to manage long-lived npm tokens while providing automatic provenance attestations.

## Prerequisites

### npm Account Setup

1. Create an npm account at [npmjs.com](https://npmjs.com)
2. Ensure you're a maintainer of the `local-skills-mcp` package (or create it for first publish)

### Configure Trusted Publishing on npm

**Important:** You must configure trusted publishing on npmjs.com BEFORE the automated workflow can publish.

1. **Navigate to package settings:**
   - Go to https://www.npmjs.com/package/local-skills-mcp/access
   - Or: npmjs.com → Packages → local-skills-mcp → Settings → Publishing Access

2. **Add Trusted Publisher:**
   - Scroll to "Trusted publishers - Publishing automation"
   - Click "Add a trusted publisher"
   - Select "GitHub Actions"
   - Fill in:
     - **GitHub organization/user:** `kdpa-llc`
     - **Repository:** `local-skills-mcp`
     - **Workflow file:** `.github/workflows/publish.yml`
     - **Environment:** Leave empty (no environment restriction)
   - Click "Add"

3. **Verify configuration:**
   - The trusted publisher should now appear in the list
   - Status should show as "Active"

### MCP Registry Setup (Future)

The MCP Registry publishing is already configured in the workflow but requires:

- MCP Publisher CLI (automatically installed in workflow)
- GitHub token (automatically provided via `secrets.GITHUB_TOKEN`)

## Publishing Process

### Automated Publishing (Recommended)

The package automatically publishes to npm and MCP Registry when you create a GitHub release:

1. **Update version:**

   ```bash
   npm version [patch|minor|major]
   # Example: npm version patch (0.1.0 → 0.1.1)
   ```

2. **Push changes and tags:**

   ```bash
   git push origin main
   git push origin --tags
   ```

3. **Create GitHub Release:**
   - Go to: https://github.com/kdpa-llc/local-skills-mcp/releases/new
   - Select the version tag (e.g., `v0.1.1`)
   - Title: `v0.1.1` (or your version)
   - Generate release notes or write custom notes
   - Click "Publish release"

4. **Automated workflow:**
   - GitHub Actions automatically:
     - Builds the project
     - Runs tests
     - Publishes to npm using OIDC (no token needed!)
     - Generates provenance attestations
     - Updates MCP Registry
   - Monitor progress: [Actions tab](https://github.com/kdpa-llc/local-skills-mcp/actions)

5. **Verify publication:**
   - npm: https://www.npmjs.com/package/local-skills-mcp
   - MCP Registry: Search for `io.github.kdpa-llc/local-skills-mcp`

### Manual Publishing (Fallback)

If automated publishing fails or for initial setup:

#### Prerequisites

- npm CLI v11.5.1 or later (for OIDC support)
- npm account with publishing permissions

#### Steps

1. **Build and test:**

   ```bash
   npm ci
   npm run build
   npm test
   ```

2. **Test package locally:**

   ```bash
   # Dry run to verify package contents
   npm pack --dry-run

   # Create actual tarball for testing
   npm pack

   # Test installation
   npm install -g ./local-skills-mcp-*.tgz
   local-skills-mcp --help

   # Cleanup
   npm uninstall -g local-skills-mcp
   rm local-skills-mcp-*.tgz
   ```

3. **Login to npm:**

   ```bash
   npm login
   # Follow prompts to authenticate
   ```

4. **Publish to npm:**

   ```bash
   # With provenance attestations (recommended)
   npm publish --provenance --access public

   # Or without provenance
   npm publish --access public
   ```

5. **Verify publication:**

   ```bash
   # Check npm
   npm view local-skills-mcp

   # Test installation
   npm install -g local-skills-mcp
   local-skills-mcp --help
   ```

#### MCP Registry (Manual)

1. **Install MCP Publisher:**

   ```bash
   # macOS/Linux
   curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_linux_amd64.tar.gz" | tar xz
   sudo mv mcp-publisher /usr/local/bin/

   # Verify
   mcp-publisher --version
   ```

2. **Authenticate and publish:**

   ```bash
   # Login with GitHub
   mcp-publisher login github

   # Publish to registry
   mcp-publisher publish
   ```

3. **Verify:**
   ```bash
   curl "https://registry.modelcontextprotocol.io/v0/servers?search=kdpa-llc/local-skills-mcp"
   ```

## Security Benefits of OIDC Publishing

✅ **No long-lived tokens:** No npm tokens stored in GitHub secrets
✅ **Short-lived credentials:** Each publish uses temporary, workflow-specific credentials
✅ **Cannot be exfiltrated:** Credentials are tied to specific workflow context
✅ **Automatic provenance:** Supply chain verification built-in
✅ **Audit trail:** Complete publish history in GitHub Actions

## Troubleshooting

### "Failed to authenticate" during automated publish

**Cause:** Trusted publisher not configured on npmjs.com
**Solution:** Follow [Configure Trusted Publishing](#configure-trusted-publishing-on-npm) section above

### "npm CLI version too old"

**Cause:** npm CLI version < 11.5.1
**Solution:** Update npm in workflow (already configured) or locally:

```bash
npm install -g npm@latest
```

### Workflow runs but publish step fails

1. **Check GitHub Actions logs:**
   - Go to [Actions tab](https://github.com/kdpa-llc/local-skills-mcp/actions)
   - Click on failed run
   - Expand "Publish to npm" step

2. **Common issues:**
   - Trusted publisher configuration mismatch
   - Package version already published (bump version)
   - npm registry temporarily unavailable

3. **Manual fallback:**
   - Use manual publishing process above
   - Create issue if problem persists

### Package published but MCP Registry fails

**Note:** MCP Registry publishing depends on successful npm publish.

1. **Verify npm package:** Check https://www.npmjs.com/package/local-skills-mcp
2. **Check MCP Publisher logs** in GitHub Actions
3. **Manual MCP publish:** Use fallback process above

## Version Management

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

Use npm version commands:

```bash
npm version patch  # 0.1.0 → 0.1.1 (bug fixes)
npm version minor  # 0.1.0 → 0.2.0 (new features)
npm version major  # 0.1.0 → 1.0.0 (breaking changes)
```

## Resources

- [npm Trusted Publishing Documentation](https://docs.npmjs.com/trusted-publishers)
- [npm Trusted Publishing Announcement](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/)
- [GitHub Actions Publishing Guide](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [MCP Registry Publishing Guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/publish-server.md)
- [Provenance Attestations](https://docs.npmjs.com/generating-provenance-statements)

## Support

For publishing issues:

- Check [GitHub Discussions](https://github.com/kdpa-llc/local-skills-mcp/discussions)
- Open an [issue](https://github.com/kdpa-llc/local-skills-mcp/issues)
- Contact maintainers
