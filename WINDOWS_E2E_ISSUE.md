# Windows E2E Testing Issues

## Overview

The End-to-End (E2E) tests for the Local Skills MCP Server are currently **skipped on Windows** due to platform-specific issues with subprocess stdio communication and file handle management. While the unit and integration tests (76 tests) run successfully on all platforms, the E2E tests (12 tests) that spawn the server as a subprocess encounter reliability issues on Windows.

## Current Status

- **Unit Tests**: ✅ 11 tests - Passing on all platforms
- **Skill Loader Tests**: ✅ 22 tests - Passing on all platforms
- **Index Tests**: ✅ 24 tests - Passing on all platforms
- **Integration Tests**: ✅ 19 tests - Passing on all platforms
- **E2E Tests**: ⚠️ 12 tests - **Skipped on Windows** (passing on Linux/macOS)

**Total**: 76 tests pass on Windows, 88 tests pass on Linux/macOS

## Problems Encountered on Windows

### 1. File Handle Leaks

Despite comprehensive fixes, Windows has stricter file handle management:

```typescript
// Current cleanup in src/e2e.test.ts lines 183-199
if (this.serverProcess!.stdout) {
  this.serverProcess!.stdout.removeAllListeners();
  try {
    this.serverProcess!.stdout.destroy();
  } catch {
    // Ignore errors during cleanup
  }
}
```

**Issue**: Even with explicit `.destroy()` calls on all streams (stdin, stdout, stderr), Windows sometimes retains file handles longer than expected, causing subsequent tests to fail intermittently.

### 2. Process Termination Timing

Windows handles process signals differently:

```typescript
// Line 209: Different signals needed per platform
const signal = process.platform === "win32" ? "SIGINT" : "SIGTERM";
```

**Issue**:

- `SIGTERM` doesn't work on Windows - must use `SIGINT`
- Even with `SIGINT`, Windows processes take longer to fully terminate
- Extended timeouts (500ms on Windows vs 300ms on Linux) still show intermittent issues

### 3. Subprocess Stdio Buffering

**Issue**: Windows handles stdio buffering differently than Unix systems:

- Line-buffered output on Unix becomes fully-buffered on Windows
- JSON-RPC messages over stdio may arrive fragmented
- The current line-based parsing (lines 105-123) can miss or misparse messages

```typescript
// Current implementation assumes clean line breaks
private processBuffer(): void {
  const lines = this.buffer.split("\n");
  this.buffer = lines.pop() || "";
  // ...
}
```

### 4. Working Directory Locks

**Partially Fixed**: CWD lock detection (src/index.test.ts lines 95-104) prevents some errors:

```typescript
if (currentDir.startsWith(tempDir)) {
  console.log("[afterEach] ⚠️ CWD is inside tempDir, changing to parent...");
  process.chdir(path.dirname(tempDir));
}
```

**Remaining Issue**: E2E tests spawn external processes that may briefly hold locks on the CWD, preventing cleanup even after the process is killed.

### 5. Startup Delays

**Current workaround** (line 100-101):

```typescript
const startupDelay = process.platform === "win32" ? 3000 : 2000;
setTimeout(() => resolve(), startupDelay);
```

**Issue**: Even 3-second delays aren't always sufficient on slower Windows machines or when under load.

## Fixes Already Implemented

The following improvements have been made but aren't sufficient for Windows reliability:

1. ✅ **Explicit stream destruction** (commit c441412)
   - All three streams (stdin, stdout, stderr) now explicitly destroyed
   - Wrapped in try-catch for defensive error handling

2. ✅ **CWD lock detection** (commit 36b208d)
   - Detects when process CWD is inside temp directory
   - Automatically changes to parent before cleanup

3. ✅ **Platform-specific timeouts** (commit 852285d)
   - Longer startup delays on Windows (3000ms vs 2000ms)
   - Longer cleanup delays (1000ms vs 100ms)
   - Extended force-kill timeout (2000ms vs 1000ms)

4. ✅ **Proper signal handling** (commit 9e0888f)
   - Uses SIGINT instead of SIGTERM on Windows
   - Implements graceful shutdown with force-kill fallback

5. ✅ **Comprehensive instrumentation** (commit 36b208d)
   - Added detailed logging for debugging
   - Tracks cleanup attempts and directory states

## Requested Fixes

To enable E2E tests on Windows, we need:

### High Priority

1. **Investigate alternative subprocess communication**
   - Consider TCP sockets instead of stdio for Windows
   - Or implement more robust stdio parsing with proper buffering

2. **Implement proper process wait**
   - Use a proper wait mechanism instead of setTimeout
   - Poll for process termination and file handle release
   - Example: Repeatedly check if files can be deleted before proceeding

3. **Add retry logic for flaky operations**
   - Retry subprocess spawn if it fails
   - Retry cleanup operations with exponential backoff
   - Mark as flaky and report but don't fail entire suite

### Medium Priority

4. **Improve stream handling**
   - Implement proper message framing for JSON-RPC
   - Don't rely solely on line breaks
   - Add message length prefixing or use content-length headers

5. **Better process lifecycle management**
   - Track process state more explicitly
   - Ensure child process has fully exited before cleanup
   - Check for orphaned processes and clean them up

### Low Priority

6. **Windows-specific test environment**
   - Create isolated test environment for Windows
   - Use different temp directory structure
   - Consider using Windows Job Objects for guaranteed cleanup

## Workaround

Currently, E2E tests are skipped on Windows (src/e2e.test.ts line 236):

```typescript
const describeE2E = process.platform === "win32" ? describe.skip : describe;
```

This is acceptable because:

- **76 unit/integration tests** provide comprehensive coverage on Windows
- **E2E tests verify the same functionality** via different means (subprocess vs in-process)
- **Linux/macOS CI** runs full test suite including E2E tests

## How to Test Locally

To run tests on Windows:

```bash
# Runs 76 tests (E2E skipped)
npm test

# To force-run E2E tests (will be flaky):
# Edit src/e2e.test.ts and change line 236 to:
# const describeE2E = describe;
```

## References

- E2E Test Implementation: `src/e2e.test.ts`
- Cleanup instrumentation: `src/index.test.ts` lines 82-117
- Previous discussion: Commits 9e0888f through 1b6c4d1
- Node.js child_process docs: https://nodejs.org/api/child_process.html
- Windows process management: https://learn.microsoft.com/en-us/windows/win32/procthread/process-and-thread-functions

## Success Criteria

E2E tests can be enabled on Windows when:

1. ✅ Tests pass reliably (>99% success rate)
2. ✅ No file handle leaks after test completion
3. ✅ Cleanup completes within reasonable time (<5 seconds per test)
4. ✅ Works on various Windows versions (10, 11, Server)
5. ✅ Stable under load (multiple parallel test runs)

## Timeline

- **Immediate**: E2E tests remain skipped on Windows (current state)
- **Short-term** (1-2 weeks): Investigate subprocess alternatives
- **Medium-term** (1 month): Implement fixes and re-enable tests
- **Long-term**: Achieve parity with Linux/macOS test coverage

---

**Last Updated**: 2025-11-07
**Status**: E2E tests disabled on Windows, investigation ongoing
**Owner**: TBD
