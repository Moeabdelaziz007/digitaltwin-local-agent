# 🐛 DigitalMiniTwin: Bug Workflow & QA

## Detection Layer
- **GlobalErrorBoundary**: Catches React component-tree render errors (Phase C).
- **Sentry Integration**: Captures unhandled server runtime exceptions and console errors in production.
- **Visual QA Pass**: Review components at 375px (Mobile) and Desktop viewports. Watch for text overflowing the `.glass-embedded` or `.chat-user` elements.

## Classification
Before submitting a fix, classify the issue:
1. `Network`: WebSocket failures (LiveKit) or PB connectivity.
2. `Auth`: Token expiry (`body.userId` mismatches) or Clerk webhook desync.
3. `Visual`: Contrast issues, z-index overlaps, or missing reduced-motion fallbacks.
4. `State Mismatch`: The `voiceState` (speaking/listening) does not align with the actual LiveKit audioTrack.

## Bug QA Script
Execute the following to quickly scan the codebase for high-risk debug artifacts before committing:
```bash
npm run scan-bugs
```
This script audits:
- Leftover `console.log` statements.
- `TODO/FIXME` annotations.
- Errant `localhost` references outside of `.env`.
- Hardcoded secrets and insecure `body.userId` auth usages.

## Fix Strategy
1. **Reproduce**: Duplicate the state exactly.
2. **Isolate**: Remove variables. If auth fails, try mock auth first before diving into Clerk.
3. **Verify**: Always run `npx tsc --noEmit && npm run build` locally before pushing. Do NOT commit a broken Next.js build.
