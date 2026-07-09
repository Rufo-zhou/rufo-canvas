# Rufo Canvas UI/UX Design System

This document records how `ui-ux-pro-max` is applied to Rufo Canvas. It extends the existing Rufo visual language; it does not replace the app palette or introduce a new brand direction.

## Product Context

- Product: AI infinite canvas for image and video creation.
- Stack: Next.js, TypeScript, Tailwind CSS, React Flow.
- Design direction: dense creative workspace, quiet controls, high precision with low effort.
- Theme policy: keep Rufo light, dark, and system theme support.

## Applied Design Rules

1. Accessibility first.
   - Icon-only controls must have accessible labels.
   - Dynamic save, upload, success, and error states must be announced with `aria-live` or `role="alert"`.
   - Keyboard focus must be visible in both light and dark modes.

2. No precision-required interactions.
   - Canvas icon controls should expose at least a 44px interaction area.
   - Node connection handles should have a larger invisible hit area than the visible dot.
   - Drag and continuation actions should show where the result will appear before generation completes.

3. Spatial continuity.
   - A generated image or video must replace its draft node in place.
   - Continuation nodes should appear near the source node or the user's release point.
   - Canvas viewport should not auto-jump during generation.

4. Motion with purpose.
   - Motion is used for feedback, loading, and state transitions only.
   - UI transitions should stay in the 150-300ms range.
   - `prefers-reduced-motion` must disable decorative or repeated animations.

5. Dense but readable workspace.
   - Toolbars can be compact, but tap/click targets must remain large enough.
   - Panels, modals, and floating controls use existing Rufo surface tokens.
   - Do not add decorative effects that compete with the artwork on the canvas.

## Current Tokens

Use existing CSS variables in `app/globals.css`:

- `--rufo-canvas-bg`
- `--rufo-canvas-panel`
- `--rufo-canvas-panel-soft`
- `--rufo-canvas-panel-muted`
- `--rufo-canvas-fg`
- `--rufo-canvas-muted`
- `--rufo-canvas-soft`
- `--rufo-canvas-border`
- `--rufo-canvas-border-soft`
- `--rufo-canvas-button`
- `--rufo-canvas-button-fg`
- `--rufo-canvas-accent`
- `--rufo-canvas-shadow`
- `--rufo-canvas-grid`
- `--rufo-canvas-media-bg`

## Implementation Checklist

- [ ] Every icon-only button has `aria-label` or equivalent accessible text.
- [ ] Every critical click target is at least 44px in one dimension and has adequate spacing.
- [ ] Connection handles do not require pixel-perfect pointer placement.
- [ ] Loading states reserve space and give visible feedback.
- [ ] Reduced motion mode remains usable.
- [ ] Light and dark mode both retain readable contrast.
- [ ] Generated media lands where the user initiated it, not on top of unrelated nodes.
