// ─── React component ──────────────────────────────────────────────────────────
export { AsciiImage } from "./react/AsciiImage";
export type { AsciiImageProps } from "./react/AsciiImage";

// ─── Hook ─────────────────────────────────────────────────────────────────────
export { useAsciiAnimation } from "./react/useAsciiAnimation";
export type { UseAsciiAnimationOptions, UseAsciiAnimationReturn } from "./react/useAsciiAnimation";

// ─── Core utilities (headless / framework-agnostic) ───────────────────────────
export { imageToAscii, renderFrame, loadImageSource, frameToString } from "./core/imageToAscii";
export type { AsciiCell, AsciiFrame, ImageToAsciiOptions, RenderOptions } from "./core/imageToAscii";

// ─── Character sets ───────────────────────────────────────────────────────────
export { getCharset, ENGLISH_CHARS, BINARY_CHARS } from "./core/charsets";
export type { CharsetName } from "./core/charsets";

// ─── Noise (exposed for custom animation loops) ───────────────────────────────
export { simplex2, simplex3 } from "./core/noise";
