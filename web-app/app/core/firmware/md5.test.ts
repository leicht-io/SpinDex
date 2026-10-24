import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { md5Hex } from './md5';

const text = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('md5Hex', () => {
    it('matches the RFC 1321 test suite', () => {
        expect(md5Hex(text(''))).toBe('d41d8cd98f00b204e9800998ecf8427e');
        expect(md5Hex(text('abc'))).toBe('900150983cd24fb0d6963f7d28e17f72');
        expect(md5Hex(text('message digest'))).toBe('f96b697d7cb7938d525a2f31aaf161d0');
        expect(md5Hex(text('12345678901234567890123456789012345678901234567890123456789012345678901234567890')))
            .toBe('57edf4a22be3c955ac49da2e2107b67a');
    });

    it('matches Node’s MD5 around block boundaries and on an image-sized buffer', () => {
        for (const size of [55, 56, 63, 64, 65, 119, 120, 1_000_003]) {
            const data = new Uint8Array(size).map((_, i) => (i * 31 + 7) & 0xff);
            expect(md5Hex(data)).toBe(createHash('md5').update(data).digest('hex'));
        }
    });
});
