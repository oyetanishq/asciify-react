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
- 📐 **`fit` prop** — CSS `object-fit`-like `"contain"` and `"cover"` modes with automatic column scaling
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

// Fixed size — numCols controls the resolution
function App() {
    return (
        <AsciiImage
            src="/path/to/image.jpg"
            numCols={120}
            charset="english"
            color
            noiseScale={0.3}
            noiseSpeed={1.0}
            background="#0a0a0a"
            fontSize={9}
        />
    );
}
```

### Responsive — fill a container (`fit` prop)

Pass `fit="contain"` or `fit="cover"` and give the component a `width` / `height`. It behaves exactly like CSS `object-fit` on an `<img>`:

- **`"contain"`** — scales the ASCII art to fit entirely within the box, preserving the image's aspect ratio (letterboxed).
- **`"cover"`** — scales it to cover the full box, cropping the image if needed.

`numCols` is **automatically computed** from the container dimensions so the character resolution always matches the available space. You can still pass `numCols` as an upper cap.

```tsx
// Fill 90% width / 60% height of the viewport — letterboxed
<AsciiImage
    fit="contain"
    width="90vw"
    height="60vh"
    src="/image.jpg"
    background="#0e0e0e"
    color
    noiseScale={0.3}
    noiseSpeed={1.0}
    fontSize={9}
/>

// Fill entire parent div — crop to cover (like a background image)
<AsciiImage
    fit="cover"
    width="100%"
    height="100%"
    src="/image.jpg"
    background="#000"
    fontSize={9}
/>
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

### Core

| Prop         | Type                                                 | Default             | Description                                           |
| ------------ | ---------------------------------------------------- | ------------------- | ----------------------------------------------------- |
| `src`        | `string \| File \| Blob \| HTMLImageElement \| null` | —                   | Image source                                          |
| `numCols`    | `number`                                             | `100`               | Column count (higher = more detail). Acts as an upper cap when `fit` is set. |
| `charset`    | `"english" \| "binary"`                              | `"english"`         | Character set to use                                  |
| `color`      | `boolean`                                            | `true`              | Color each character from its source cell             |
| `background` | `string`                                             | `"#000000"`         | CSS background color                                  |
| `noiseScale` | `number`                                             | `0`                 | Noise strength — `0` = static, `1+` = heavy scramble |
| `noiseSpeed` | `number`                                             | `0.8`               | Animation speed (noise-time/sec)                      |
| `fontSize`   | `number`                                             | `10`                | Character size in px — affects rendering resolution   |
| `fontFamily` | `string`                                             | `"monospace"`       | Font family (monospace strongly recommended)          |
| `onReady`    | `(canvas: HTMLCanvasElement) => void`                | —                   | Fires after first frame renders                       |
| `className`  | `string`                                             | —                   | Class for the wrapper `<div>`                         |
| `style`      | `CSSProperties`                                      | —                   | Inline styles for the wrapper `<div>`                 |
| `aria-label` | `string`                                             | `"ASCII art image"` | Canvas accessible label                               |

### Sizing / Responsive

| Prop     | Type                   | Default | Description                                                                 |
| -------- | ---------------------- | ------- | --------------------------------------------------------------------------- |
| `fit`    | `"contain" \| "cover"` | —       | CSS `object-fit`-like mode. Enables automatic `numCols` scaling.            |
| `width`  | `number \| string`     | `"100%"` | Container width when `fit` is set (number = px, string = any CSS length).  |
| `height` | `number \| string`     | `"100%"` | Container height when `fit` is set (number = px, string = any CSS length). |

> **How it works under the hood:** when `fit` is set, a `ResizeObserver` watches the container. On every resize — and once the image loads — two values are recomputed:
>
> 1. **`numCols`** — chosen so the character grid exactly fills the constrained dimension (width for contain, the covering dimension for cover).
> 2. **`canvasCssSize`** — exact CSS pixel dimensions derived from the image's native aspect ratio + container size, applied as `style.width` / `style.height` on the `<canvas>` element so it fills the space pixel-perfectly.

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
    time: 1.5, // increment each frame to animate
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

For responsive/fit behaviour in a custom hook consumer, pass a `containerRef` and `fit`:

```tsx
import { useRef } from "react";
import { useAsciiAnimation } from "asciify-react";

function ResponsiveCustom({ src }: { src: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { canvasRef, canvasCssSize } = useAsciiAnimation({
        src,
        numCols: 160,
        fit: "contain",
        containerRef,
        fontSize: 9,
        color: true,
    });

    return (
        <div ref={containerRef} style={{ width: "100%", height: "400px", position: "relative", overflow: "hidden" }}>
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    ...(canvasCssSize && { width: canvasCssSize.width, height: canvasCssSize.height }),
                }}
            />
        </div>
    );
}
```

---

## How It Works

The algorithm is a direct TypeScript port of [Viet Nguyen's Python ASCII art scripts](https://github.com/viet-nguyen-0612):

1. **Cell sizing** — `cellWidth = imageWidth / numCols`, `cellHeight = cellWidth * 2` (the ×2 corrects for the ~2:1 aspect ratio of monospace glyphs).
2. **Brightness sampling** — for each cell, average the luminance of all pixels in the region.
3. **Character mapping** — map brightness `[0, 1]` → index into a darkness-sorted character list.
4. **Noise perturbation** — add Simplex noise (sampled at `(col * noiseScale * 0.05, row * noiseScale * 0.05, time)`) to the brightness before mapping, creating smooth animated flickering.
5. **Color sampling** — optionally average the RGB of each cell and use it as the character fill color.
6. **Canvas rendering** — draw each character with `ctx.fillText()`.

---

## Building from source

```bash
pnpm install
pnpm run build      # compiles to dist/
pnpm run typecheck  # type-check without building
pnpm run dev        # watch mode — rebuilds dist/ on every change
```

---

## License

MIT
