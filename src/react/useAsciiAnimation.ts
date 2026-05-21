import { useEffect, useRef, useCallback, useState } from "react";
import { imageToAscii, renderFrame, loadImageSource, ImageToAsciiOptions, RenderOptions } from "../core/imageToAscii";

export interface UseAsciiAnimationOptions extends ImageToAsciiOptions, RenderOptions {
    src: string | File | Blob | HTMLImageElement | null;
    /** Pixels-per-second rate for the noise time axis. @default 0.8 */
    noiseSpeed?: number;
    /** Called once after the first frame is rendered. */
    onReady?: (canvas: HTMLCanvasElement) => void;
    /**
     * When provided, a ResizeObserver watches this element and automatically
     * recomputes numCols to fill/fit the container.
     * The explicit `numCols` prop acts as a maximum cap.
     */
    containerRef?: React.RefObject<HTMLElement | null>;
    /**
     * CSS `object-fit`-like sizing mode. Only meaningful when `containerRef` is set.
     * - `"contain"` — fill the container while preserving aspect ratio (letterboxed)
     * - `"cover"`   — fill the container fully, cropping if needed
     * - `undefined` — width-only responsive (legacy behaviour)
     */
    fit?: "contain" | "cover";
}

export interface UseAsciiAnimationReturn {
    /** Attach this ref to your <canvas> element. */
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    /** Force a re-render of the current frame (e.g. after options change). */
    redraw: () => void;
    /** Current effective number of columns (may be derived from container dimensions). */
    effectiveNumCols: number;
    /**
     * When `fit` is active, the exact CSS pixel dimensions the canvas element
     * should be styled with so it visually fills the container using contain/cover
     * semantics.  `null` when fit mode is not in use.
     */
    canvasCssSize: { width: number; height: number } | null;
}

/**
 * React hook that drives the ASCII animation loop.
 *
 * - Loads the image source into an HTMLImageElement.
 * - Runs a requestAnimationFrame loop, incrementing `time` by `noiseSpeed * dt`.
 * - Re-processes when `src`, `numCols`, `noiseScale`, `charset`, or `color` change.
 * - Cancels animation and cleans up on unmount or src change.
 */
export function useAsciiAnimation(options: UseAsciiAnimationOptions): UseAsciiAnimationReturn {
    const {
        src,
        numCols = 100,
        charset = "english",
        color = true,
        cellHeightScale = 2,
        noiseScale = 0,
        noiseSpeed = 0.8,
        background = "#000000",
        fontSize = 10,
        fontFamily = "monospace",
        onReady,
        containerRef,
        fit,
    } = options;

    const [effectiveNumCols, setEffectiveNumCols] = useState<number>(numCols);
    const [canvasCssSize, setCanvasCssSize] = useState<{ width: number; height: number } | null>(null);

    // Keep a ref so drawFrame always reads the latest value without stale closures.
    const effectiveNumColsRef = useRef<number>(effectiveNumCols);

    // Last measured container dimensions (pixels).
    const containerSizeRef = useRef<{ width: number; height: number } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const timeRef = useRef<number>(0);
    const lastTimestampRef = useRef<number | null>(null);
    const readyFiredRef = useRef<boolean>(false);

    // ─── Compute numCols from container + image dims ──────────────────────────
    //
    // charW = fontSize * 0.6, charH = fontSize * 1.2, cellHeightScale = 2 by default.
    // When cellHeightScale=2, canvas aspect ratio ≈ image aspect ratio, so we use
    // the image AR directly for cleaner CSS sizing math.
    //
    // contain → numCols that keeps canvas ≤ containerW AND ≤ containerH
    // cover   → numCols that keeps canvas ≥ containerW AND ≥ containerH
    const computeNumCols = useCallback(
        (containerW: number, containerH: number | null, img: HTMLImageElement | null): number => {
            const charW = fontSize * 0.6;
            const charH = fontSize * 1.2;

            if (!containerRef) return numCols;

            // No fit or no height → width-only (legacy behaviour).
            if (!fit || containerH === null || containerH <= 0) {
                return Math.max(1, Math.min(numCols, Math.floor(containerW / charW)));
            }

            // No image yet → approximate with width only.
            if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
                return Math.max(1, Math.min(numCols, Math.floor(containerW / charW)));
            }

            const imgW = img.naturalWidth;
            const imgH = img.naturalHeight;

            // Option A: size by container width.
            const numColsByWidth = Math.max(1, Math.floor(containerW / charW));
            const numRowsByWidth = Math.max(1, Math.floor((imgH * numColsByWidth) / (imgW * cellHeightScale)));
            const canvasHByWidth = numRowsByWidth * charH;

            // Option B: size by container height.
            const numRowsByHeight = Math.max(1, Math.floor(containerH / charH));
            const numColsByHeight = Math.max(
                1,
                Math.round((imgW * numRowsByHeight * cellHeightScale) / imgH),
            );

            let cols: number;
            if (fit === "contain") {
                cols = canvasHByWidth <= containerH ? numColsByWidth : numColsByHeight;
            } else {
                // cover
                cols = canvasHByWidth >= containerH ? numColsByWidth : numColsByHeight;
            }

            return Math.max(1, Math.min(numCols, cols));
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [containerRef, fit, fontSize, numCols, cellHeightScale],
    );

    // ─── Compute CSS pixel dimensions for the canvas element ─────────────────
    //
    // numCols determines rendering RESOLUTION (how many characters).
    // canvasCssSize is the CSS size we apply to the <canvas> element so it
    // visually fills the container with contain/cover semantics — just like
    // CSS object-fit does for <img>.
    //
    // Since canvas AR ≈ image AR (when cellHeightScale=2), we use image AR directly.
    const computeCanvasCssSize = useCallback(
        (
            containerW: number,
            containerH: number,
            img: HTMLImageElement | null,
        ): { width: number; height: number } | null => {
            if (!fit || !img || img.naturalWidth <= 0 || img.naturalHeight <= 0) return null;

            const imgAR = img.naturalWidth / img.naturalHeight;
            const containerAR = containerW / containerH;

            if (fit === "contain") {
                if (imgAR >= containerAR) {
                    // Image is wider relative to container → width-constrained
                    return { width: containerW, height: Math.round(containerW / imgAR) };
                } else {
                    // Image is taller relative to container → height-constrained
                    return { width: Math.round(containerH * imgAR), height: containerH };
                }
            } else {
                // cover
                if (imgAR >= containerAR) {
                    // Image is wider → height-constrained (scale up by height to cover width)
                    return { width: Math.round(containerH * imgAR), height: containerH };
                } else {
                    // Image is taller → width-constrained (scale up by width to cover height)
                    return { width: containerW, height: Math.round(containerW / imgAR) };
                }
            }
        },
        [fit],
    );

    // ─── Sync effectiveNumColsRef with state ──────────────────────────────────
    useEffect(() => {
        effectiveNumColsRef.current = effectiveNumCols;
    }, [effectiveNumCols]);

    // ─── ResizeObserver – track container W+H, recompute cols + CSS size ──────
    useEffect(() => {
        if (!containerRef) {
            setEffectiveNumCols(numCols);
            effectiveNumColsRef.current = numCols;
            containerSizeRef.current = null;
            setCanvasCssSize(null);
            return;
        }

        const el = containerRef.current;
        if (!el) return;

        const update = (width: number, height: number) => {
            containerSizeRef.current = { width, height };
            const cols = computeNumCols(width, height, imageRef.current);
            setEffectiveNumCols(cols);
            effectiveNumColsRef.current = cols;
            setCanvasCssSize(computeCanvasCssSize(width, height, imageRef.current));
        };

        // Initial measurement.
        update(el.clientWidth, el.clientHeight);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const boxSize = entry.contentBoxSize?.[0];
            const width = boxSize?.inlineSize ?? (entry.target as HTMLElement).clientWidth;
            const height = boxSize?.blockSize ?? (entry.target as HTMLElement).clientHeight;
            update(width, height);
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, [containerRef, computeNumCols, computeCanvasCssSize, numCols]);

    // ─── Draw a single frame ──────────────────────────────────────────────────
    const drawFrame = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;

        const frame = imageToAscii(image, {
            numCols: effectiveNumColsRef.current,
            charset,
            color,
            cellHeightScale,
            noiseScale,
            time: timeRef.current,
        });

        renderFrame(canvas, frame, { background, fontSize, fontFamily });

        if (!readyFiredRef.current && onReady) {
            readyFiredRef.current = true;
            onReady(canvas);
        }
    }, [effectiveNumCols, charset, color, cellHeightScale, noiseScale, background, fontSize, fontFamily, onReady]);

    // ─── Animation loop ───────────────────────────────────────────────────────
    const startLoop = useCallback(() => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

        const loop = (timestamp: number) => {
            if (lastTimestampRef.current !== null) {
                const dt = (timestamp - lastTimestampRef.current) / 1000;
                if (noiseScale > 0 && noiseSpeed > 0) {
                    timeRef.current += dt * noiseSpeed;
                }
            }
            lastTimestampRef.current = timestamp;

            drawFrame();

            if (noiseScale > 0 && noiseSpeed > 0) {
                rafRef.current = requestAnimationFrame(loop);
            }
        };

        rafRef.current = requestAnimationFrame(loop);
    }, [drawFrame, noiseScale, noiseSpeed]);

    const stopLoop = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        lastTimestampRef.current = null;
    }, []);

    // ─── Load image & start loop when src changes ─────────────────────────────
    useEffect(() => {
        if (!src) {
            stopLoop();
            imageRef.current = null;
            return;
        }

        let cancelled = false;
        stopLoop();
        timeRef.current = 0;
        readyFiredRef.current = false;

        loadImageSource(src)
            .then((img) => {
                if (cancelled) return;
                imageRef.current = img;

                // Recompute with proper contain/cover math now that we have image dims.
                if (containerSizeRef.current) {
                    const { width, height } = containerSizeRef.current;
                    const cols = computeNumCols(width, height, img);
                    setEffectiveNumCols(cols);
                    effectiveNumColsRef.current = cols;
                    setCanvasCssSize(computeCanvasCssSize(width, height, img));
                }

                startLoop();
            })
            .catch((err) => {
                if (!cancelled) console.error("[asciify-react] Failed to load image:", err);
            });

        return () => {
            cancelled = true;
            stopLoop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // ─── Restart loop when animation options change ───────────────────────────
    useEffect(() => {
        if (!imageRef.current) return;
        stopLoop();
        startLoop();
    }, [noiseScale, noiseSpeed, startLoop, stopLoop]);

    // ─── Redraw static frame when rendering options change ────────────────────
    useEffect(() => {
        if (!imageRef.current) return;
        if (rafRef.current === null) {
            drawFrame();
        }
    }, [numCols, charset, color, cellHeightScale, background, fontSize, drawFrame]);

    const redraw = useCallback(() => {
        drawFrame();
    }, [drawFrame]);

    return { canvasRef, redraw, effectiveNumCols, canvasCssSize };
}
