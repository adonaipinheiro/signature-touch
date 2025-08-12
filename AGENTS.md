# AGENTS.md — Guidance for Code Generation (Codex)

This document describes how AI/codegen tools should interact with the **react-native-signature-touch** project.
It encodes the project’s goals, API, constraints, style, and testing requirements so generated code remains consistent, safe, and high‑quality.

---

## 1) Project Summary

**react-native-signature-touch** is a lightweight, framework‑agnostic React Native library to capture signatures using **`react-native-svg`**.
It renders a drawable surface, builds smooth paths with quadratic curves, and exports the signature as **SVG** or **PNG/JPEG**.
The library is intentionally UI‑minimal and does **not** include camera, navigation, stores, or i18n.

**Targets:** iOS and Android (React Native 0.79+). Web compatibility depends on the consumer’s `react-native-web` + `react-native-svg` setup.

**Primary entry:** `src/Signature.tsx` exporting `Signature` (component) and types `SignatureRef`, `SignatureProps`.

---

## 2) Non‑Goals / Out of Scope

- No camera capture, document scanning, or OCR.
- No app‑level concerns (navigation, stores, i18n, theming).
- No bundling of peer deps; the consumer installs `react-native-svg`.
- No platform‑specific native modules; keep it pure JS/TS + `react-native-svg`.

---

## 3) Public API

### Component
```ts
export type SignatureProps = {
  strokeColor?: string;            // default '#000'
  strokeWidth?: number;            // default 3
  backgroundColor?: string;        // default 'transparent'
  minDistance?: number;            // default 2 (filter between points)
  onBegin?: () => void;
  onEnd?: (paths: string[]) => void;
  onChange?: (hasStrokes: boolean) => void;
  style?: any;                     // container style
};

export type SignatureRef = {
  clear(): void;
  undo(): void;
  redo(): void;
  isEmpty(): boolean;
  getSvg(): { svg: string; width: number; height: number };
  getImage(opts?: {
    mimeType?: 'image/png' | 'image/jpeg';
    quality?: number;
    scale?: number;
  }): Promise<string>; // data URL
};
```

### Exports
```ts
export { Signature } from './Signature';
export type { SignatureRef, SignatureProps } from './Signature';
```

### Usage (consumer)
```tsx
<Signature
  ref={sigRef}
  strokeColor="#111"
  strokeWidth={3}
  backgroundColor="#fff"
  onBegin={() => {}}
  onChange={(has) => {}}
  onEnd={(paths) => {}}
/>
```

---

## 4) Architecture & Key Decisions

- **Drawing engine:** `PanResponder` collects touch points into `currentPoints`; on release, convert to an SVG `d` path via **quadratic curve smoothing** and append to `paths`.
- **Smoothing:** `pointsToPath(points)` builds a path using Q curves between midpoints. `minDistance` filters noisy moves.
- **Undo/Redo:** two stacks in JS: `paths` state and an internal `redoStack` ref.
- **Export (image):** use `react-native-svg`’s `toDataURL` on the `<Svg/>` ref (no `view-shot`).
- **Export (svg):** assemble an SVG string including optional `<rect>` background.
- **Agnostic UI:** component contains **no** buttons; consumers build their own toolbar with the imperative ref.
- **Performance:** avoid re-rendering the entire surface on every move; only bump a small tick state and keep `currentPoints` in a ref.

---

## 5) Constraints for Code Generation

- **TypeScript strictness:** assume `strict: true` and possibly `noUncheckedIndexedAccess: true`.
  - Do **not** index arrays without guards; prefer destructuring or `.at()` with null checks.
- **Immutability:** treat props as readonly; state updates via functional `setState` where needed.
- **Refs:** annotate refs (`useRef<Type>(initial)`), never leave them possibly undefined at runtime.
- **Peer dependency:** never import or bundle anything except `react-native-svg` (peer) and RN/React.
- **No side effects on mount** beyond setting up responders and layout measurement.
- **Minimal re-renders:** memoize handlers with `useCallback`, group deps correctly.
- **API stability:** do not rename public props or ref methods without bumping semver and updating docs/tests.

---

## 6) Testing Requirements

- Testing framework: **Jest** + **@testing-library/react-native**.
- Provide a **mock for `react-native-svg`** exposing `toDataURL` for image export tests.
- Achieve **100% coverage** for `src/Signature.tsx` and the helper `pointsToPath`.
- Avoid `fireEvent('ResponderGrant'...)` when possible. Prefer calling the responder handlers directly:
  `root.props.onResponderGrant({ nativeEvent: { locationX, locationY } })`, etc., to bypass RN TouchHistory.
- Validate:
  - `onBegin`, `onChange`, `onEnd` callbacks.
  - `clear`, `undo`, `redo`, `isEmpty` behavior.
  - `getSvg` string contains `<path>` and optional `<rect>` depending on `backgroundColor`.
  - `getImage` resolves a data URL and rejects when `toDataURL` is not available.

---

## 7) Repository Structure (expected)

```
src/
  Signature.tsx
  index.ts
__tests__/ (or src/__tests__/)
  Signature.spec.tsx
  pointsToPath.spec.ts
__mocks__/
  react-native-svg.tsx   // mock with toDataURL
```

---

## 8) Coding Style & Linting

- Follow ESLint + Prettier (project config).
- Prefer `readonly` arrays in function signatures when applicable.
- Use `strokeLinecap="round"` and `strokeLinejoin="round"` on rendered `<Path>` elements.
- Keep the component’s default `style` as `{ flex: 1 }` to fill parent unless overridden.

---

## 9) Versioning & Release

- Conventional Commits recommended (`feat:`, `fix:`, `chore:`...).
- Release flow (suggested): push to `main` → CI builds and publishes to npm, or tag `v*` to trigger release workflow.
- The npm package should include only `lib/*` (compiled output) and necessary metadata; source may be excluded to keep the tarball small.

---

## 10) Prompts & Recipes for Codex

Use these as starting prompts when generating code changes:

### A) Add eraser mode
> Implement an optional `eraser` mode that removes segments where the eraser path overlaps. Keep API minimal: `eraserEnabled?: boolean` and `eraserRadius?: number`. Must work with current path format (SVG `d`). Include tests for erasing partially overlapping paths.

### B) Export raw points
> Add a method `getPoints(): Point[][]` that returns the raw point arrays for each stroke. Ensure types are exported. Add tests validating serialization and deserialization round‑trip (`pointsToPath` consistency).

### C) Pressure support
> Accept `pressure` from touch events when available and map to `strokeWidth` dynamically within reasonable bounds. Provide a callback `onSample?(sample: { x,y,pressure })`. Include tests that simulate pressure variations.

### D) Web friendliness
> Provide an example and a short note in README about using this component with `react-native-web` and `react-native-svg` on web, including `toDataURL` caveats.

---

## 11) Known Limitations

- Extremely long signatures may increase memory usage (many points). Consider throttling or capping `minDistance` for performance.
- `toDataURL` requires a recent `react-native-svg`. Consumers should update if they face unsupported errors.
- Multi-touch gestures are not supported; the surface is single‑touch by design.

---

## 12) Acceptance Checklist for PRs (by humans or AI)

- [ ] Public API unchanged or semver-bumped when changed
- [ ] New code follows constraints in §5
- [ ] Tests added/updated; coverage remains 100% for touched files
- [ ] README updated when changing user‑visible behavior
- [ ] No breaking changes sneaked in without clear documentation
