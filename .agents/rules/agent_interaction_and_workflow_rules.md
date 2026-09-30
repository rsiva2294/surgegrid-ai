# Agent Interaction & Workflow Rules

These rules govern agent behavior, interaction patterns, and execution discipline across all tasks. The agent MUST strictly adhere to these rules without exception.

---

## 1. No Autonomous / Unsolicited Browser Tests
- **Never trigger browser subagents automatically**: Do NOT launch `browser_subagent` or autonomous browser testing sessions on your own initiative.
- **User-Led Verification**: When implementation, fixes, or builds are complete, notify the user with the local URL (e.g. `http://127.0.0.1:5173/`) and let the user inspect in their own browser.
- **Explicit Trigger Only**: Only execute browser tests when the user explicitly instructs you to test in the browser (e.g., *"test this in the browser"* or *"run browser test"*).

---

## 2. Plan & Approval-First Protocol
- **Do Not Start Work Immediately**: When given a new directive, feature request, or architectural pivot, do NOT start modifying code immediately.
- **Mandatory Alignment Step**:
  1. Clearly state what was understood.
  2. Outline the specific step-by-step implementation plan.
  3. Detail which files will be touched and what data will be used.
  4. Wait for explicit user review and approval before writing or editing code.

---

## 3. Lean Scope & Anti-Bloat Mandate ("Ship Only What's Necessary")
- **Avoid Data Swamps**: Never dump multiple large, uncurated datasets into the active project or map.
- **Strict Data Hygiene**:
  - Keep active public asset directories (e.g. `public/data/`) lean, minimal, and ultra-compact (< 1–2 MB max).
  - Move non-essential, exploratory, or legacy datasets into a separate archive directory (e.g. `data-archive/`).
- **Focus on the Core Story**: Implement only the minimal, high-impact features and layers requested. Each visual element on the map or UI must have a clear purpose.

---

## 4. Commit First, Do Not Deploy Without Explicit Request
- **Commit Upon Completion**: Once changes pass compilation, typecheck, and local testing, immediately commit the changes with a clean, descriptive message.
- **Never Deploy Unsolicited**: Do NOT deploy to hosting, production, or remote environments (e.g. `firebase deploy`) unless the user explicitly requests deployment (e.g., *"deploy to hosting"*, *"deploy this"*).

---

## 5. Maintain Project Changelog
- **Keep Changelog Updated**: Always document completed milestones, architectural changes, deployments, and test results in `docs/PROJECT_LOG.md`.
- **Maintain Chronological History**: Number each log item sequentially, note the files touched and commit hashes, and keep the log synchronized with every milestone.

---

## 6. Verification & Milestone Communication
- **Compile & Typecheck**: Ensure production build (`npm run build` or `flutter analyze`) compiles cleanly with zero errors before reporting completion.
- **Concise Reporting**: Report exactly what was completed, key file paths, and status.
- **Wait for Direction**: Pause after each milestone and ask the user for confirmation and next steps.
