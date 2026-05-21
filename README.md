# asciify-react

> Convert any image into animated ASCII art. A zero-dependency TypeScript package with a plug-and-play React component.

---

<img width="1566" height="1019" alt="image" src="https://github.com/user-attachments/assets/0ef08075-16bf-48e7-8e92-5f1189a45623" />

*DEMO*: [asciify-react.vercel.app](http://asciify-react.vercel.app)

## Features

- 🖼️ **Image → ASCII** conversion, running entirely in the browser via Canvas APIs (no server needed)
- 🎨 **Full-color** mode — each character is tinted with the average color of its source region
- 🔡 **Two character sets** — `"english"` (A–Z density ramp) or `"binary"` (`0`, `1`, space)
- 🌊 **Animated Simplex noise** — perturbs character selection each frame for a live, shimmering effect
- ⚡ **Zero runtime dependencies** — Simplex noise is inlined; only peer deps are React 17+
- 🔧 **Headless API** — use the core functions without React (plain canvas, Node canvas, etc.)
- 📦 **ESM + CJS + `.d.ts`** — works with Vite, Next.js, Webpack, and any modern bundler

---

## Installation

```bash
npm install asciify-react
# or
yarn add asciify-react
# or
pnpm add asciify-react
```

---

## Quick Start

```tsx
import { AsciiImage } from "asciify-react";

function App() {
    return <AsciiImage src="/path/to/image.jpg" numCols={120} charset="english" color noiseScale={0.3} noiseSpeed={1.0} background="#0a0a0a" fontSize={9} />;
}
```

### From a file input

```tsx
import { useState } from "react";
import { AsciiImage } from "asciify-react";

function UploadDemo() {
    const [file, setFile] = useState<File | null>(null);

    return (
        <>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <AsciiImage src={file} numCols={100} noiseScale={0.2} noiseSpeed={0.5} />}
        </>
    );
}
```

---

## `<AsciiImage />` Props

| Prop         | Type                                                 | Default             | Description                                          |
| ------------ | ---------------------------------------------------- | ------------------- | ---------------------------------------------------- |
| `src`        | `string \| File \| Blob \| HTMLImageElement \| null` | —                   | Image source                                         |
| `numCols`    | `number`                                             | `100`               | Column count (higher = more detail)                  |
| `charset`    | `"english" \| "binary"`                              | `"english"`         | Character set to use                                 |
| `color`      | `boolean`                                            | `true`              | Color each character from its source cell            |
| `background` | `string`                                             | `"#000000"`         | CSS background color                                 |
| `noiseScale` | `number`                                             | `0`                 | Noise strength — `0` = static, `1+` = heavy scramble |
| `noiseSpeed` | `number`                                             | `0.8`               | Animation speed (noise-time/sec)                     |
| `fontSize`   | `number`                                             | `10`                | Character size in px (affects canvas size)           |
| `fontFamily` | `string`                                             | `"monospace"`       | Font family (use monospace)                          |
| `onReady`    | `(canvas: HTMLCanvasElement) => void`                | —                   | Fires after first frame renders                      |
| `className`  | `string`                                             | —                   | Class for the wrapper `<div>`                        |
| `style`      | `CSSProperties`                                      | —                   | Inline styles for the wrapper `<div>`                |
| `aria-label` | `string`                                             | `"ASCII art image"` | Canvas accessible label                              |

---

## Headless / Framework-Agnostic API

```ts
import { loadImageSource, imageToAscii, renderFrame, frameToString } from "asciify-react";

const img = await loadImageSource("/my-image.jpg");

// Convert to ASCII frame
const frame = imageToAscii(img, {
    numCols: 80,
    charset: "binary",
    color: false,
    noiseScale: 0.2,
    time: 1.5, // increment this each frame to animate
});

// Render to a canvas
const canvas = document.getElementById("my-canvas") as HTMLCanvasElement;
renderFrame(canvas, frame, { background: "#111", fontSize: 10 });

// Or get a plain text string
const text = frameToString(frame);
console.log(text);
```

---

## Custom Animation Loop

Use `useAsciiAnimation` directly if you need more control:

```tsx
import { useAsciiAnimation } from "asciify-react";

function Custom({ src }: { src: File }) {
    const { canvasRef } = useAsciiAnimation({
        src,
        numCols: 80,
        noiseScale: 0.4,
        noiseSpeed: 1.2,
        color: true,
    });

    return <canvas ref={canvasRef} />;
}
```

---

## How It Works

The algorithm is a direct TypeScript port of [Viet Nguyen's Python ASCII art scripts](https://github.com/viet-nguyen-0612):

1. **Cell sizing** — `cellWidth = imageWidth / numCols`, `cellHeight = cellWidth * 2` (the ×2 corrects for the ~2:1 aspect ratio of monospace glyphs, identical to the Python `scale = 2`).
2. **Brightness sampling** — for each cell, average the luminance of all pixels in the region.
3. **Character mapping** — map brightness `[0,1]` → index into a darkness-sorted character list.
4. **Noise perturbation** — add Simplex noise (sampled at `(col * noiseScale * 0.05, row * noiseScale * 0.05, time)`) to the brightness before mapping. This creates smooth, animated character flickering.
5. **Color sampling** — optionally average the RGB of each cell and use it as the character fill color.
6. **Canvas rendering** — draw each character with `ctx.fillText()`.

---

## Building from source

```bash
cd package
pnpm install
pnpm run build      # compiles to dist/
pnpm run typecheck  # type-check without building
```

---

## License

MIT
