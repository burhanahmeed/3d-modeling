# 🧊 Text-to-3D Web App — Claude Code Hackathon Plan (Next.js)

## Overview

A fully web-based, chat-driven 3D modeling tool built with Next.js. The user describes an object in plain text, Claude generates Three.js geometry code, and it renders live in the browser. The user iterates via chat to refine the model, then exports to STL for 3D printing.

**Stack:** Next.js 16 (App Router) + Claude API + Three.js + Tailwind CSS
**Hosting:** Vercel (one-click deploy)
**API Key:** Server-side via Next.js API route (never exposed to client)

---

## Architecture

```
User types prompt
      ↓
Next.js API Route (/api/generate)
      ↓
Claude API (claude-sonnet-4-6) — server-side
      ↓
Returns Three.js buildScene() function as string
      ↓
Client evals code → renders on Three.js canvas
      ↓
User iterates via chat → scene updates live
      ↓
Export button → downloads .STL file
```

---

## Project Structure

```
/
├── app/
│   ├── page.tsx                # Main app page
│   ├── layout.tsx              # Root layout
│   └── api/
│       └── generate/
│           └── route.ts        # Claude API route (server-side)
├── components/
│   ├── ChatPanel.tsx           # Left: chat interface
│   ├── ThreeCanvas.tsx         # Right: Three.js canvas
│   ├── ExportButton.tsx        # STL export
│   └── StyleToolbar.tsx        # Wireframe / Clay / Neon toggles
├── lib/
│   ├── prompts.ts              # System prompt + few-shot examples
│   └── stlExporter.ts          # STL export utility
├── .env.local                  # ANTHROPIC_API_KEY
└── package.json
```

---

## Claude Code Implementation Steps

### Phase 0 — Bootstrap (15 min) ✅

**Prompt Claude Code:**
> "Bootstrap a Next.js 14 app with App Router and Tailwind CSS. Install three, @types/three, and @anthropic-ai/sdk. Create a split-panel layout: left 35% is a chat sidebar, right 65% is a dark canvas area."

```bash
npx create-next-app@latest text-to-3d --typescript --tailwind --app
cd text-to-3d
npm install three @types/three @anthropic-ai/sdk
```

---

### Phase 1 — Three.js Canvas Component (45 min)

**Prompt Claude Code:**
> "Create a ThreeCanvas React component that:
> - Sets up a Three.js scene with OrbitControls, ambient + directional lighting, and a subtle grid helper
> - Exposes a `runCode(codeString: string)` method via useImperativeHandle
> - The runCode method clears all user-added meshes, evals the code as a function buildScene(scene, THREE), and calls it
> - Wraps in a useEffect that handles resize and cleanup"

Key pattern for eval:
```typescript
const runCode = (codeString: string) => {
  // Clear previous meshes
  scene.children
    .filter(obj => obj.userData.userAdded)
    .forEach(obj => scene.remove(obj));

  // Eval and run
  const fn = new Function('scene', 'THREE', codeString);
  fn(scene, THREE);
};
```

---

### Phase 2 — Claude API Route (30 min)

**Prompt Claude Code:**
> "Create a Next.js API route at /api/generate that accepts POST with `{ messages: Message[] }`, calls Claude claude-sonnet-4-6 with the system prompt below, and returns the response text as JSON. Use ANTHROPIC_API_KEY from environment variables."

System prompt to use:
```
You are a 3D modeling assistant. When the user describes an object,
respond ONLY with the body of a JavaScript function that adds geometry
to a Three.js scene. The function signature is:

  function buildScene(scene, THREE) { ... }

Rules:
- Only output the function body (no function declaration wrapper)
- Use THREE.MeshStandardMaterial for all materials
- Center all geometry at origin (0, 0, 0)
- Mark every mesh with userData.userAdded = true
- No comments, no explanation, only code
```

---

### Phase 3 — Chat Panel (45 min)

**Prompt Claude Code:**
> "Create a ChatPanel component with a message list showing user/assistant bubbles, an input box and send button. On send, POST to /api/generate with full message history. On response, pass the code string to ThreeCanvas via ref. Show a loading skeleton on the canvas while waiting. Use React state for messages array."

Wire up in `page.tsx`:
```typescript
const canvasRef = useRef(null);

const handleResponse = (code: string) => {
  canvasRef.current?.runCode(code);
};
```

---

### Phase 4 — STL Export (30 min)

**Prompt Claude Code:**
> "Add an Export STL button using Three.js STLExporter. Traverse all meshes where userData.userAdded is true, export as binary STL, and trigger a file download. Show a brief success toast."

```typescript
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';

const exportSTL = () => {
  const exporter = new STLExporter();
  const result = exporter.parse(scene, { binary: true });
  const blob = new Blob([result], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'model.stl';
  link.click();
};
```

---

### Phase 5 — Polish (45 min)

**Prompt Claude Code:**
> "Add these finishing touches:
> 1. Style toolbar with 3 buttons: Wireframe, Clay (flat white MeshStandardMaterial), Neon (emissive teal)
> 2. Reset Scene button that clears all user meshes and chat history
> 3. Keyboard shortcut: Enter to send, Shift+Enter for newline
> 4. Responsive layout that stacks vertically on mobile
> 5. Subtle animated gradient background behind the canvas"

---

## .env.local

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Why Next.js over Vanilla HTML

| | Vanilla HTML | Next.js |
|---|---|---|
| API Key security | Exposed in client | Hidden in API route |
| Component structure | Manual | React components |
| Deploy | Manual upload | `git push` → Vercel auto-deploy |
| Streaming support | Complex | Built-in with Route Handlers |
| Future features | Hard to scale | Easy to add DB, auth, etc. |

---

## Key Prompts to Test at Demo

| Prompt | Expected Output |
|--------|----------------|
| "A simple chair with four legs" | Box seat + 4 cylinder legs |
| "A coffee mug with a handle" | Cylinder + torus handle |
| "Make it taller" | Scales Y axis of previous model |
| "Add a hole through the middle" | Visual gap or CSG-style cutout |
| "A phone stand at 30 degrees" | Angled wedge with slot |

---

## Stretch Goals (if time allows)

- **Streaming response** — Stream Claude's code token-by-token with a typing indicator
- **Model history sidebar** — Thumbnail previews of previous iterations
- **Shareable URL** — Serialize scene code to URL hash
- **Voice input** — Web Speech API for hands-free prompting
- **Multi-object scenes** — "Add a table next to the chair"

---

## Deploy in 2 Minutes

```bash
# Push to GitHub, then:
vercel --prod

# Set env var in Vercel dashboard:
# ANTHROPIC_API_KEY = sk-ant-...
```

---

## Demo Script (2 minutes)

1. Open the app, type: *"A simple wooden table"*
2. Show the 3D render, rotate it with orbit controls
3. Type: *"Make the legs thinner and taller"* — show live update
4. Type: *"Add a drawer on one side"* — show iteration
5. Click **Export STL** → show the downloaded file
6. Bonus: paste into [viewstl.com](https://viewstl.com) to confirm valid geometry

---

## Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Claude API Docs](https://docs.anthropic.com)
- [Three.js Docs](https://threejs.org/docs/)
- [Three.js STLExporter](https://threejs.org/examples/#misc_exporter_stl)
- [Vercel Deploy](https://vercel.com/docs)
