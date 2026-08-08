# Workspace Rules & Guidelines

## Browser Automation and Playwright Configuration

Due to persistent CDN download issues (404 errors on `playwright.azureedge.net`), downloading Playwright's bundled Chromium binary is blocked. 

To work around this, follow these rules for browser automation, tests, or subagents in this workspace:

1. **Default Browser Channel**: Always configure Playwright to launch using the host system's pre-installed Chrome browser by specifying the channel:
   ```javascript
   const browser = await playwright.chromium.launch({
     channel: 'chrome'
   });
   ```

2. **Skip Browser Downloads**: When installing dependencies or running setup in this workspace, set the environment variable:
   ```env
   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
   ```

3. **Subagent Tasks**: When instructing browser subagents, explicitly specify in their task prompt to use launch options with `{ channel: 'chrome' }` if they are executing local Playwright scripts.
