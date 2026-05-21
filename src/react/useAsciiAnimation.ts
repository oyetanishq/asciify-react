import { useEffect, useRef, useCallback } from "react";
import { imageToAscii, renderFrame, loadImageSource, ImageToAsciiOptions, RenderOptions } from "../core/imageToAscii";

export interface UseAsciiAnimationOptions extends ImageToAsciiOptions, RenderOptions {
    src: string | File | Blob | HTMLImageElement | null;
    /** Pixels-per-second rate for the noise time axis. @default 0.8 */
    noiseSpeed?: number;
    /** Called once after the first frame is rendered. */
    onReady?: (canvas: HTMLCanvasElement) => void;
}

export interface UseAsciiAnimationReturn {
    /** Attach this ref to your <canvas> element. */
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    /** Force a re-render of the current frame (e.g. after options change). */
    redraw: () => void;
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
    } = options;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const timeRef = useRef<number>(0);
    const lastTimestampRef = useRef<number | null>(null);
    const readyFiredRef = useRef<boolean>(false);

    // ─── Draw a single frame ──────────────────────────────────────────────────
    const drawFrame = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image) return;

        const frame = imageToAscii(image, {
            numCols,
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
    }, [numCols, charset, color, cellHeightScale, noiseScale, background, fontSize, fontFamily, onReady]);

    // ─── Animation loop ───────────────────────────────────────────────────────
    const startLoop = useCallback(() => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

        const loop = (timestamp: number) => {
            if (lastTimestampRef.current !== null) {
                const dt = (timestamp - lastTimestampRef.current) / 1000; // seconds
                if (noiseScale > 0 && noiseSpeed > 0) {
                    timeRef.current += dt * noiseSpeed;
                }
            }
            lastTimestampRef.current = timestamp;

            drawFrame();

            // Only keep looping if there is actual animation
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
        // If animation is running the loop handles redraws, else force one
        if (rafRef.current === null) {
            drawFrame();
        }
    }, [numCols, charset, color, cellHeightScale, background, fontSize, drawFrame]);

    const redraw = useCallback(() => {
        drawFrame();
    }, [drawFrame]);

    return { canvasRef, redraw };
}
