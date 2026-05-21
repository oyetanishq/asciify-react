import { getCharset, CharsetName } from "./charsets";
import { simplex3 } from "./noise";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single ASCII cell with its character and sampled color. */
export interface AsciiCell {
    char: string;
    /** Red channel 0-255 */
    r: number;
    /** Green channel 0-255 */
    g: number;
    /** Blue channel 0-255 */
    b: number;
}

/** The full output of a single conversion frame. */
export interface AsciiFrame {
    cells: AsciiCell[][];
    numCols: number;
    numRows: number;
}

/** Options for the core imageToAscii conversion. */
export interface ImageToAsciiOptions {
    /**
     * Number of character columns in the output.
     * More columns = finer detail, heavier computation.
     * @default 100
     */
    numCols?: number;
    /**
     * Character set to use.
     * @default "english"
     */
    charset?: CharsetName;
    /**
     * If true, each character is colored with the average color of its source cell.
     * If false, all characters render white-on-black.
     * @default true
     */
    color?: boolean;
    /**
     * Scale factor for cell height relative to cell width.
     * Set to 2 to compensate for the ~2:1 aspect ratio of monospace font characters,
     * which is the same correction used in the original Python scripts.
     * @default 2
     */
    cellHeightScale?: number;
    /**
     * Noise offset added to the brightness index, creating scrambled characters.
     * 0 = no noise, 0.1–0.5 = subtle, 1+ = heavy scramble.
     * @default 0
     */
    noiseScale?: number;
    /**
     * Time value used for noise animation. Increment this each frame to animate.
     * @default 0
     */
    time?: number;
}

// ─── Offscreen canvas helpers ─────────────────────────────────────────────────

/** Load an image source into an HTMLImageElement (handles URL strings, File, and Blob). */
export function loadImageSource(src: string | File | Blob | HTMLImageElement): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        if (src instanceof HTMLImageElement) {
            if (src.complete && src.naturalWidth > 0) {
                resolve(src);
            } else {
                src.onload = () => resolve(src);
                src.onerror = reject;
            }
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";

        if (typeof src === "string") {
            img.src = src;
        } else {
            // File or Blob
            const url = URL.createObjectURL(src);
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load image"));
            };
            img.src = url;
            return;
        }

        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}

// ─── Core conversion ──────────────────────────────────────────────────────────

/**
 * Convert an image to an AsciiFrame using an offscreen canvas.
 *
 * The algorithm mirrors the original Python scripts:
 *  1. Sample average brightness of each cell → pick a character.
 *  2. Optionally add simplex noise to perturb the character index.
 *  3. Optionally sample average RGB color of each cell.
 */
export function imageToAscii(image: HTMLImageElement, options: ImageToAsciiOptions = {}): AsciiFrame {
    const { numCols = 100, charset = "english", color = true, cellHeightScale = 2, noiseScale = 0, time = 0 } = options;

    const charList = getCharset(charset);
    const numChars = charList.length;

    const { naturalWidth: imgW, naturalHeight: imgH } = image;

    // Calculate cell dimensions (same math as in the Python scripts)
    let cellW = imgW / numCols;
    let cellH = cellW * cellHeightScale;
    let cols = numCols;
    let rows = Math.floor(imgH / cellH);

    // Clamp if numCols is too large for the image
    if (cols > imgW || rows > imgH) {
        cellW = 6;
        cellH = 12;
        cols = Math.floor(imgW / cellW);
        rows = Math.floor(imgH / cellH);
    }

    // Draw source image to offscreen canvas once
    const offscreen = document.createElement("canvas");
    offscreen.width = imgW;
    offscreen.height = imgH;
    const ctx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get 2D context for offscreen canvas");
    ctx.drawImage(image, 0, 0);

    const cells: AsciiCell[][] = [];

    for (let i = 0; i < rows; i++) {
        const row: AsciiCell[] = [];
        for (let j = 0; j < cols; j++) {
            const x = Math.floor(j * cellW);
            const y = Math.floor(i * cellH);
            const w = Math.max(1, Math.min(Math.ceil(cellW), imgW - x));
            const h = Math.max(1, Math.min(Math.ceil(cellH), imgH - y));

            const { data } = ctx.getImageData(x, y, w, h);
            const pixelCount = w * h;

            let rSum = 0,
                gSum = 0,
                bSum = 0,
                brightnessSum = 0;

            for (let p = 0; p < data.length; p += 4) {
                const r = data[p];
                const g = data[p + 1];
                const b = data[p + 2];
                rSum += r;
                gSum += g;
                bSum += b;
                // Luminance formula matching np.mean of a grayscale cell
                brightnessSum += 0.299 * r + 0.587 * g + 0.114 * b;
            }

            // Normalise brightness to [0, 1]
            const brightness = brightnessSum / pixelCount / 255;

            // Apply simplex noise perturbation to the brightness index
            let noisedBrightness = brightness;
            if (noiseScale > 0) {
                const n = simplex3(j * noiseScale * 0.05, i * noiseScale * 0.05, time);
                // n is in [-1, 1] — shift it to [0, 1] then scale by noiseScale
                noisedBrightness = Math.max(0, Math.min(1, brightness + n * noiseScale * 0.25));
            }

            const charIndex = Math.min(Math.floor(noisedBrightness * numChars), numChars - 1);
            const char = charList[charIndex];

            const avgR = color ? Math.round(rSum / pixelCount) : 255;
            const avgG = color ? Math.round(gSum / pixelCount) : 255;
            const avgB = color ? Math.round(bSum / pixelCount) : 255;

            row.push({ char, r: avgR, g: avgG, b: avgB });
        }
        cells.push(row);
    }

    return { cells, numCols: cols, numRows: rows };
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────

export interface RenderOptions {
    /** Background color of the canvas. @default "#000000" */
    background?: string;
    /** Font size in pixels. @default 10 */
    fontSize?: number;
    /** Font family. @default "monospace" */
    fontFamily?: string;

    // ─── Mouse interaction ────────────────────────────────────────────────────

    /**
     * Whether the mouse attracts characters toward it or pushes them away.
     * @default "push"
     */
    mouseMode?: "attract" | "push";
    /**
     * Maximum pixel displacement applied to a character at the cursor's center.
     * @default 20
     */
    hoverStrength?: number;
    /**
     * Reference radius for the Gaussian falloff (in canvas pixels).
     * At this distance from the cursor the force is `e^(-hoverSpread)` of peak strength.
     * With the default `hoverSpread=2` this is roughly the half-strength point.
     * @default 80
     */
    hoverAreaSize?: number;
    /**
     * Tightness of the Gaussian bell curve.
     * `force = hoverStrength × exp(-hoverSpread × (dist/hoverAreaSize)²)`
     * - `1` — wide soft halo
     * - `2` — balanced (default)
     * - `5+` — tightly concentrated near cursor
     * @default 2
     */
    hoverSpread?: number;
    /**
     * Current mouse position in canvas pixel coordinates.
     * Pass `null` (or omit) to disable the interaction.
     */
    mousePos?: { x: number; y: number } | null;
}

/**
 * Render an AsciiFrame onto a canvas element.
 * Call this in a requestAnimationFrame loop for animation.
 */
export function renderFrame(canvas: HTMLCanvasElement, frame: AsciiFrame, options: RenderOptions = {}): void {
    const { background = "#000000", fontSize = 10, fontFamily = "monospace", mouseMode = "push", hoverStrength = 20, hoverAreaSize = 80, hoverSpread = 2, mousePos = null } = options;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const charW = fontSize * 0.6; // approximate monospace glyph width
    const charH = fontSize * 1.2;

    const canvasW = frame.numCols * charW;
    const canvasH = frame.numRows * charH;

    if (canvas.width !== canvasW) canvas.width = canvasW;
    if (canvas.height !== canvasH) canvas.height = canvasH;

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = "top";

    const hasMouseInteraction = mousePos !== null && hoverStrength > 0 && hoverAreaSize > 0;

    for (let i = 0; i < frame.numRows; i++) {
        const row = frame.cells[i];
        if (!row) continue;
        for (let j = 0; j < frame.numCols; j++) {
            const cell = row[j];
            if (!cell) continue;

            // Base position (top-left of the character cell)
            let dx = 0;
            let dy = 0;

            if (hasMouseInteraction && mousePos) {
                // Center of this character cell in canvas pixels
                const cx = j * charW + charW * 0.5;
                const cy = i * charH + charH * 0.5;

                const diffX = cx - mousePos.x;
                const diffY = cy - mousePos.y;
                const dist = Math.sqrt(diffX * diffX + diffY * diffY);

                if (dist > 0) {
                    // Gaussian radial falloff: strength = hoverStrength × e^(−spread × (dist/area)²)
                    // Naturally circular, no hard edge, smoothly → 0 as dist → ∞
                    const r = dist / hoverAreaSize;
                    const force = Math.exp(-hoverSpread * r * r) * hoverStrength;

                    // Unit vector from mouse to cell (push) or cell to mouse (attract)
                    const nx = diffX / dist;
                    const ny = diffY / dist;

                    if (mouseMode === "push") {
                        dx = nx * force;
                        dy = ny * force;
                    } else {
                        // attract: pull toward cursor
                        dx = -nx * force;
                        dy = -ny * force;
                    }
                }
            }

            ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`;
            ctx.fillText(cell.char, j * charW + dx, i * charH + dy);
        }
    }
}

// ─── Raw string output ────────────────────────────────────────────────────────

/**
 * Convert an AsciiFrame to a plain text string.
 * Useful for accessibility labels, clipboard copy, or headless use.
 */
export function frameToString(frame: AsciiFrame): string {
    return frame.cells.map((row) => row.map((c) => c.char).join("")).join("\n");
}
