# Contributing to Local Skills MCP

Thank you for your interest in contributing to Local Skills MCP! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue on GitHub with:
- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (Node version, OS, etc.)
- Any relevant logs or error messages

### Suggesting Features

We welcome feature suggestions! Please open an issue with:
- A clear description of the feature
- The problem it solves
- Any examples or use cases
- Optional: proposed implementation approach

### Pull Requests

1. **Fork the repository** and create your branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, concise commit messages
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm install
   npm run build
   ```

4. **Submit a pull request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure CI checks pass

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/local-skills.git
cd local-skills

# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run watch
```

## Code Style

- Use TypeScript with strict type checking
- Follow existing patterns and conventions
- Keep functions focused and modular
- Add comments for complex logic
- Use meaningful variable and function names

## Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues and pull requests when relevant
- First line should be concise (50 chars or less)
- Add detailed description if needed after a blank line

## Project Structure

```
local-skills-mcp/
├── src/
│   ├── index.ts          # MCP server and handlers
│   ├── skill-loader.ts   # Skill loading logic
│   └── types.ts          # TypeScript type definitions
├── skills/               # Example skills
└── dist/                 # Compiled output
```

## Testing

Currently, testing is manual. To test your changes:

1. Build the project: `npm run build`
2. Configure MCP client to use your local build
3. Test skill discovery and loading
4. Verify error handling

We welcome contributions to add automated testing!

## Documentation

When adding features or changing functionality:
- Update README.md
- Update QUICK_START.md if needed
- Add/update code comments
- Consider adding examples

## Community

- Be respectful and inclusive
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)
- Help others in discussions and issues
- Share your skills and use cases!

## Questions?

Feel free to open an issue for questions or join the discussion in existing issues.

Thank you for contributing! 🎉
