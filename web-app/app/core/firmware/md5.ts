/*
  MD5 of a byte array, as lowercase hex. esptool-js uses it to check each
  image it wrote by reading it back from flash (the device reports the
  flash's MD5), the way esptool.py's "Hash of data verified" does. WebCrypto
  has no MD5, and it's only an integrity check against transfer errors, not
  a security one.
*/

// Per-round shift amounts, and the sine-derived constants (RFC 1321).
const SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

export const md5Hex = (data: Uint8Array): string => {
    // Padding: 0x80, zeros to 56 mod 64, then the bit length (little endian).
    const length = ((data.length + 8) >>> 6) + 1 << 6;
    const bytes = new Uint8Array(length);
    bytes.set(data);
    bytes[data.length] = 0x80;
    const view = new DataView(bytes.buffer);
    view.setUint32(length - 8, (data.length * 8) >>> 0, true);
    view.setUint32(length - 4, Math.floor(data.length / 2 ** 29), true);

    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;

    for (let chunk = 0; chunk < length; chunk += 64) {
        let a = a0;
        let b = b0;
        let c = c0;
        let d = d0;
        for (let i = 0; i < 64; i++) {
            const round = i >> 4;
            let f: number;
            let g: number;
            if (round === 0) {
                f = (b & c) | (~b & d);
                g = i;
            } else if (round === 1) {
                f = (d & b) | (~d & c);
                g = (5 * i + 1) % 16;
            } else if (round === 2) {
                f = b ^ c ^ d;
                g = (3 * i + 5) % 16;
            } else {
                f = c ^ (b | ~d);
                g = (7 * i) % 16;
            }
            // eslint-disable-next-line security/detect-object-injection -- i < 64, both tables have 64 entries
            const sum = (a + f + K[i] + view.getUint32(chunk + g * 4, true)) >>> 0;
            const shift = SHIFTS[(round << 2) | (i & 3)];
            a = d;
            d = c;
            c = b;
            b = (b + ((sum << shift) | (sum >>> (32 - shift)))) >>> 0;
        }
        a0 = (a0 + a) >>> 0;
        b0 = (b0 + b) >>> 0;
        c0 = (c0 + c) >>> 0;
        d0 = (d0 + d) >>> 0;
    }

    const digest = new DataView(new ArrayBuffer(16));
    [a0, b0, c0, d0].forEach((word, i) => digest.setUint32(i * 4, word, true));
    return Array.from(new Uint8Array(digest.buffer), byte => byte.toString(16).padStart(2, '0')).join('');
};
