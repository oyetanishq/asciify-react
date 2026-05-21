import React, { CSSProperties, forwardRef } from "react";
import { useAsciiAnimation } from "./useAsciiAnimation";
import { CharsetName } from "../core/charsets";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AsciiImageProps {
    /**
     * Image source. Accepts:
     * - A URL string (must be CORS-accessible if cross-origin)
     * - A `File` or `Blob` (e.g. from an <input type="file">)
     * - An existing `HTMLImageElement`
     * - `null` to render nothing
     */
    src: string | File | Blob | HTMLImageElement | null;

    /**
     * Number of character columns.
     * Higher = more detail, heavier computation.
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
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * `<AsciiImage />` renders an image as animated ASCII art on a `<canvas>`.
 *
 * @example
 * ```tsx
 * <AsciiImage
 *   src={myFile}
 *   numCols={120}
 *   charset="english"
 *   color
 *   noiseScale={0.3}
 *   noiseSpeed={1.0}
 *   background="#0a0a0a"
 *   fontSize={9}
 * />
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
    } = props;

    const { canvasRef } = useAsciiAnimation({
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
    });

    const containerStyle: CSSProperties = {
        display: "inline-block",
        lineHeight: 0,
        backgroundColor: background,
        ...style,
    };

    return (
        <div ref={ref} className={className} style={containerStyle}>
            <canvas ref={canvasRef} role="img" aria-label={ariaLabel} style={{ display: "block" }} />
        </div>
    );
});

AsciiImage.displayName = "AsciiImage";
