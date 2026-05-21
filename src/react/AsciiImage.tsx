import React, { CSSProperties, forwardRef, useRef } from "react";
import { useAsciiAnimation } from "./useAsciiAnimation";
import { CharsetName } from "../core/charsets";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AsciiImageProps {
    /**
     * Image source. Accepts:
     * - A URL string (must be CORS-accessible if cross-origin)
     * - A `File` or `Blob` (e.g. from an `<input type="file">`)
     * - An existing `HTMLImageElement`
     * - `null` to render nothing
     */
    src: string | File | Blob | HTMLImageElement | null;

    /**
     * Number of character columns.
     * Higher = more detail, heavier computation.
     * When `fit` is set this acts as an upper cap — the actual column count
     * is derived from the container dimensions and image aspect ratio.
     * @default 100
     */
    numCols?: number;

    /**
     * Character set used for rendering.
     * - `"english"` — full A-Z character ramp sorted by density
     * - `"binary"` — only `0`, `1`, and space
     * @default "english"
     */
    charset?: CharsetName;

    /**
     * Whether to sample and apply the average color of each cell to its character.
     * When `false`, all characters render white on the background color.
     * @default true
     */
    color?: boolean;

    /**
     * Background color string (any valid CSS color).
     * @default "#000000"
     */
    background?: string;

    /**
     * Controls how much simplex noise is mixed into the character selection.
     * - `0` — no noise, perfectly static output
     * - `0.1–0.5` — subtle shimmer
     * - `1+` — heavy scramble
     * @default 0
     */
    noiseScale?: number;

    /**
     * Controls the speed of the noise animation (units: noise-time per second).
     * Has no effect when `noiseScale` is 0.
     * @default 0.8
     */
    noiseSpeed?: number;

    /**
     * Font size in pixels for the canvas characters.
     * Affects the physical output size of the canvas.
     * @default 10
     */
    fontSize?: number;

    /**
     * Font family for the canvas characters.
     * A monospace font is strongly recommended.
     * @default "monospace"
     */
    fontFamily?: string;

    /**
     * Callback fired once after the first frame has been rendered.
     * Receives the underlying `<canvas>` element.
     */
    onReady?: (canvas: HTMLCanvasElement) => void;

    /** Optional CSS class name for the wrapping container div. */
    className?: string;

    /** Optional inline styles for the wrapping container div. */
    style?: CSSProperties;

    /**
     * Optional accessible label for the canvas.
     * Defaults to "ASCII art image".
     */
    "aria-label"?: string;

    /**
     * CSS `object-fit`-like sizing mode.
     *
     * - `"contain"` — the ASCII art is scaled so it fits entirely within the
     *   container while preserving the image's aspect ratio (letterboxed).
     * - `"cover"` — the ASCII art is scaled so it fully covers the container,
     *   cropping the image if its aspect ratio doesn't match.
     *
     * When set, the component observes its container with a ResizeObserver and
     * recomputes `numCols` automatically on every resize. Pair with `width` and
     * `height` to give the container an explicit size, or let the parent control
     * dimensions via CSS (e.g. `style={{ width: "100%", height: "100%" }}`).
     */
    fit?: "contain" | "cover";

    /**
     * Container width (any valid CSS length or a number treated as pixels).
     * Has no effect without `fit`.
     * @example width={800}   width="100%"   width="50vw"
     */
    width?: number | string;

    /**
     * Container height (any valid CSS length or a number treated as pixels).
     * Has no effect without `fit`.
     * @example height={600}  height="100%"  height="50vh"
     */
    height?: number | string;

    /**
     * @deprecated Use `fit="contain"` instead.
     * Fills parent container width and auto-adjusts `numCols` to match.
     * @default false
     */
    responsive?: boolean;

    // ─── Mouse interaction ────────────────────────────────────────────────────

    /**
     * Whether hovering the mouse over the ASCII art pushes characters away
     * or attracts them toward the cursor.
     * @default "push"
     */
    mouseMode?: "attract" | "push";

    /**
     * Maximum pixel displacement applied to characters at the very center of
     * the cursor.
     * Set to `0` (default) to disable mouse interaction entirely.
     * @default 0
     */
    hoverStrength?: number;

    /**
     * Radius of the interaction zone in canvas pixels.
     * Characters beyond this distance from the cursor are unaffected.
     * @default 80
     */
    hoverAreaSize?: number;

    /**
     * Controls how quickly the effect fades with distance.
     * `1` = linear, `2` = quadratic (softer edge), higher = sharper boundary.
     * @default 2
     */
    hoverSpread?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCssLength(v: number | string | undefined): string | undefined {
    if (v === undefined) return undefined;
    return typeof v === "number" ? `${v}px` : v;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * `<AsciiImage />` renders an image as animated ASCII art on a `<canvas>`.
 *
 * @example
 * ```tsx
 * // Fixed column count (classic)
 * <AsciiImage src={myFile} numCols={120} charset="english" color noiseScale={0.3} />
 *
 * // Fill a 800×500 box — contain mode (letterboxed)
 * <AsciiImage src={myFile} fit="contain" width={800} height={500} numCols={200} />
 *
 * // Fill entire parent — cover mode (cropped)
 * <AsciiImage src={myFile} fit="cover" style={{ width: "100%", height: "100%" }} />
 * ```
 */
export const AsciiImage = forwardRef<HTMLDivElement, AsciiImageProps>(function AsciiImage(props, ref) {
    const {
        src,
        numCols = 100,
        charset = "english",
        color = true,
        background = "#000000",
        noiseScale = 0,
        noiseSpeed = 0.8,
        fontSize = 10,
        fontFamily = "monospace",
        onReady,
        className,
        style,
        "aria-label": ariaLabel = "ASCII art image",
        fit,
        width,
        height,
        responsive = false,
        mouseMode = "push",
        hoverStrength = 0,
        hoverAreaSize = 80,
        hoverSpread = 2,
    } = props;

    // Internal ref used as the ResizeObserver anchor.
    const containerRef = useRef<HTMLDivElement>(null);

    // Enable responsive behaviour when `fit` is set OR the legacy `responsive` flag is on.
    const isResponsive = !!(fit || responsive);

    const { canvasRef, canvasCssSize } = useAsciiAnimation({
        src,
        numCols,
        charset,
        color,
        background,
        noiseScale,
        noiseSpeed,
        fontSize,
        fontFamily,
        onReady,
        containerRef: isResponsive ? containerRef : undefined,
        fit,
        mouseMode,
        hoverStrength,
        hoverAreaSize,
        hoverSpread,
    });

    // ─── Container style ──────────────────────────────────────────────────────
    // The container establishes the sizing context. With fit mode:
    //   contain → background color shows in letterbox areas
    //   cover   → container clips the canvas overflow
    const containerStyle: CSSProperties = isResponsive
        ? {
              display: "block",
              width: toCssLength(width) ?? "100%",
              height: toCssLength(height) ?? "100%",
              overflow: "hidden",
              position: "relative",
              lineHeight: 0,
              backgroundColor: background,
              ...style,
          }
        : {
              display: "inline-block",
              lineHeight: 0,
              backgroundColor: background,
              ...style,
          };

    // ─── Canvas style ─────────────────────────────────────────────────────────
    // canvasCssSize drives the VISUAL size of the canvas element.
    //   - It is computed from the image aspect ratio + container dimensions.
    //   - For contain: canvas fits within the container (may have letterbox).
    //   - For cover:   canvas fills the container (may overflow and get clipped).
    // The canvas's intrinsic pixel resolution (set by renderFrame) is independent
    // and determined by numCols — so there is no quality loss from CSS scaling.
    const canvasStyle: CSSProperties = isResponsive
        ? {
              display: "block",
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              // Apply exact CSS dimensions once the image is loaded and
              // canvasCssSize is known; before that the canvas is invisible.
              ...(canvasCssSize ? { width: `${canvasCssSize.width}px`, height: `${canvasCssSize.height}px` } : { visibility: "hidden" }),
          }
        : { display: "block" };

    return (
        <div
            ref={(node) => {
                // Wire both the internal containerRef and any forwarded ref.
                containerRef.current = node;
                if (typeof ref === "function") ref(node);
                else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            className={className}
            style={containerStyle}
        >
            <canvas ref={canvasRef} role="img" aria-label={ariaLabel} style={canvasStyle} />
        </div>
    );
});

AsciiImage.displayName = "AsciiImage";
