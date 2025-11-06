# Fix Windows CI Test Failures

## Problem

Tests are failing on Windows CI due to file handle management issues:

1. **EBUSY errors**: Windows cannot remove temp directories because file handles aren't being released
2. **MaxListenersExceededWarning**: Server instances aren't being properly closed between tests
3. **E2E timeouts**: Subprocess tests timeout due to improper process management

## Current Status

- ✅ Tests pass on Linux and macOS
- ❌ Tests fail on Windows
- ⚠️ CI temporarily allows Windows failures to unblock development

## Root Cause

Windows has stricter file locking semantics than Unix systems:

- File handles stay open longer after operations
- Server instances hold locks on directories they're watching
- Subprocess cleanup requires explicit process termination

## Required Fixes

### 1. Server Lifecycle Management

The `LocalSkillsServer` class needs proper cleanup methods:

```typescript
// In src/index.ts - Add cleanup method to LocalSkillsServer
export class LocalSkillsServer {
  // ... existing code ...

  /**
   * Properly close the server and release all resources
   */
  async close(): Promise<void> {
    await this.server.close();
    // Allow time for all handles to be released
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
```

Then update tests:

```typescript
// In src/index.test.ts
describe("LocalSkillsServer", () => {
  let tempDir: string;
  let server: LocalSkillsServer | null = null;

  afterEach(async () => {
    // CRITICAL: Close server BEFORE cleaning up files
    if (server) {
      try {
        await server.close();
      } catch (err) {
        console.warn("Error closing server:", err);
      }
      server = null;
    }

    // Windows needs extra time for handles to be released
    await new Promise((resolve) => setTimeout(resolve, 200));

    // THEN clean up temp directory
    if (tempDir) {
      await removeDir(tempDir);
      tempDir = "";
    }
  });

  it("should create server instance successfully", () => {
    server = new LocalSkillsServer(); // Assign to outer scope
    expect(server).toBeDefined();
  });
});
```

### 2. Event Listener Limits

Add at the top of test files to prevent MaxListenersExceededWarning:

```typescript
// In src/index.test.ts and src/e2e.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Increase max listeners for test suite
process.setMaxListeners(20);

// ... rest of test file
```

### 3. Enhanced Directory Cleanup

The current `removeDir` implementation is already improved but may need additional Windows-specific handling:

```typescript
// Potential enhancement to removeDir in src/index.test.ts
async function removeDir(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    return;
  }

  const maxRetries = 15; // Increase retries for Windows
  const baseDelay = 150; // Increase base delay

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      fs.rmSync(dir, {
        recursive: true,
        force: true,
        maxRetries: 10, // Increase built-in retries
        retryDelay: 150, // Increase built-in delay
      });
      return;
    } catch (error: any) {
      const isRetryable =
        error.code === "EBUSY" ||
        error.code === "ENOTEMPTY" ||
        error.code === "EPERM";

      if (isRetryable && attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = baseDelay * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (attempt === maxRetries - 1) {
        console.warn(
          `Failed to remove directory ${dir} after ${maxRetries} attempts:`,
          error.message
        );
        return;
      }

      throw error;
    }
  }
}
```

### 4. E2E Process Management

Current implementation is already good but ensure proper signal handling on Windows:

```typescript
// In src/e2e.test.ts - Verify this is in place
async stop(): Promise<void> {
  if (this.serverProcess) {
    return new Promise((resolve) => {
      let resolved = false;

      const doResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      this.serverProcess!.once("exit", () => {
        setTimeout(doResolve, 300); // Increase to 300ms for Windows
      });

      // On Windows, SIGTERM might not work - use 'SIGINT' first
      const signal = process.platform === 'win32' ? 'SIGINT' : 'SIGTERM';
      this.serverProcess!.kill(signal);

      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill("SIGKILL");
        }
        setTimeout(doResolve, 500); // Longer timeout for Windows
      }, 1500); // Give more time before force kill on Windows
    });
  }
}
```

## Testing Plan

To verify fixes work on Windows:

1. **Local Windows Testing**:

   ```bash
   npm test
   npm run test:coverage
   ```

2. **Watch for specific errors**:
   - EBUSY errors should not appear
   - MaxListenersExceededWarning should not appear
   - E2E tests should complete within timeout
   - All 87 tests should pass

3. **CI Verification**:
   - Remove `continue-on-error` from `.github/workflows/ci.yml`
   - Push and verify Windows CI passes

## Acceptance Criteria

- [ ] All tests pass on Windows CI (Node 18, 20, 22)
- [ ] No EBUSY errors during cleanup
- [ ] No MaxListenersExceededWarning
- [ ] E2E tests complete without timeout
- [ ] Test coverage remains at same level
- [ ] Remove `continue-on-error` from Windows CI configuration

## References

- Windows file locking behavior: https://docs.microsoft.com/en-us/windows/win32/fileio/file-locking
- Node.js fs.rmSync options: https://nodejs.org/api/fs.html#fsrmsyncpath-options
- Child process signals on Windows: https://nodejs.org/api/child_process.html#child_process_subprocess_kill_signal

## Labels

- `bug`
- `windows`
- `tests`
- `technical-debt`
- `good-first-issue` (with guidance)

## Priority

**Medium** - Tests pass on primary development platforms (Linux/macOS), but Windows support is important for contributors.

---

**Note**: This is tracked as technical debt. The current implementation has basic Windows support, but needs enhancement for CI reliability.
