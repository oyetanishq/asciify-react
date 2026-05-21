/**
 * Character sets for ASCII art generation.
 *
 * Characters are ordered from darkest (most ink) to lightest (least ink),
 * mirroring the brightness-sorted approach used in the original Python scripts.
 */

/** Standard English alphabet characters, sorted by visual density (dark → light). */
export const ENGLISH_CHARS = "@%#MWNmwBQRDHK8&EbdpqgUCGOAXk0Z5S$aehoPLJYT34F69I2nVs1jycutzixrf7v!?)(|l][}{=+;:^,_-~`'.  ";

/**
 * Binary charset: only `0`, `1`, and space.
 * `0` is visually denser than `1`, space is the lightest.
 */
export const BINARY_CHARS = "01 ";

export type CharsetName = "english" | "binary";

/** Return the raw character string for a given charset name. */
export function getCharset(name: CharsetName): string {
    switch (name) {
        case "english":
            return ENGLISH_CHARS;
        case "binary":
            return BINARY_CHARS;
    }
}
