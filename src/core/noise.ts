/**
 * Compact, self-contained 2D + time Simplex Noise implementation.
 * No external dependencies.
 *
 * Adapted from Stefan Gustavson's public-domain simplex noise algorithm.
 * Returns values in the range [-1, 1].
 */

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const GRAD3: [number, number][] = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0, 1],
    [0, -1],
];

function buildPermutation(): Uint8Array {
    const p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates shuffle with a fixed seed for determinism
    let seed = 42;
    for (let i = 255; i > 0; i--) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        const j = Math.abs(seed) % (i + 1);
        const tmp = p[i];
        p[i] = p[j];
        p[j] = tmp;
    }
    for (let i = 0; i < 256; i++) p[256 + i] = p[i];
    return p;
}

const perm = buildPermutation();

function dot2(g: [number, number], x: number, y: number): number {
    return g[0] * x + g[1] * y;
}

/**
 * 2D Simplex noise at coordinates (x, y).
 * Returns a value in [-1, 1].
 */
export function simplex2(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = perm[ii + perm[jj]] % 12;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;

    let n0 = 0,
        n1 = 0,
        n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
        t0 *= t0;
        n0 = t0 * t0 * dot2(GRAD3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
        t1 *= t1;
        n1 = t1 * t1 * dot2(GRAD3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
        t2 *= t2;
        n2 = t2 * t2 * dot2(GRAD3[gi2], x2, y2);
    }

    return 70 * (n0 + n1 + n2);
}

/**
 * Sample noise at a 3D coordinate (x, y, t) by slicing through
 * two 2D planes and combining, giving smooth temporal animation.
 */
export function simplex3(x: number, y: number, t: number): number {
    // Combine two 2D slices offset by the time coordinate
    const a = simplex2(x + t * 0.3, y + t * 0.2);
    const b = simplex2(x - t * 0.2, y + t * 0.3);
    return (a + b) * 0.5;
}
