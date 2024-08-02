/*
    This test contains a variety of hashing functions.
    Both very simple ones as well as more complicated and obfoscated ones.
    Some are based on the hashing functions used by fingerprinting scripts.
*/

noHash = (inputString)=>{
	var hash = 0;
	if (inputString.length == 0) return hash;
	for (i = 0; i < inputString.length; i++) {
		var c = inputString.charCodeAt(i);
		hash = hash + c;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}


// Based on: https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
simpleHash = (inputString)=>{
	var hash = 0;
	if (inputString.length == 0) return hash;
	for (i = 0; i < inputString.length; i++) {
		var c = inputString.charCodeAt(i);
		hash = ((hash << 5) - hash) + c;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
}

// Based on: http://www.myersdaily.org/joseph/javascript/md5.js
// More details at: http://www.myersdaily.org/joseph/javascript/md5-text.html
md5Hash = (inputString)=>{
    md5cycle = (x, k) => {
        var a = x[0], b = x[1], c = x[2], d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17,  606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12,  1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7,  1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7,  1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22,  1236535329);
        
        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14,  643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9,  38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5,  568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20,  1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14,  1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);
        
        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16,  1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11,  1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4,  681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23,  76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16,  530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10,  1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6,  1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6,  1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21,  1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15,  718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);
        
        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
        
        }
        
        cmn = (q, a, b, x, s, t) => {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
        }
        
        ff = (a, b, c, d, x, s, t) => {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
        }
        
        gg = (a, b, c, d, x, s, t) => {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
        }
        
        hh = (a, b, c, d, x, s, t) => {
        return cmn(b ^ c ^ d, a, b, x, s, t);
        }
        
        ii = (a, b, c, d, x, s, t) => {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
        }
        
        md51 = (s) => {
        txt = '';
        var n = s.length,
        state = [1732584193, -271733879, -1732584194, 271733878], i;
        for (i=64; i<=s.length; i+=64) {
        md5cycle(state, md5blk(s.substring(i-64, i)));
        }
        s = s.substring(i-64);
        var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
        for (i=0; i<s.length; i++)
        tail[i>>2] |= s.charCodeAt(i) << ((i%4) << 3);
        tail[i>>2] |= 0x80 << ((i%4) << 3);
        if (i > 55) {
        md5cycle(state, tail);
        for (i=0; i<16; i++) tail[i] = 0;
        }
        tail[14] = n*8;
        md5cycle(state, tail);
        return state;
        }
        
        /* there needs to be support for Unicode here,
         * unless we pretend that we can redefine the MD-5
         * algorithm for multi-byte characters (perhaps
         * by adding every four 16-bit characters and
         * shortening the sum to 32 bits). Otherwise
         * I suggest performing MD-5 as if every character
         * was two bytes--e.g., 0040 0025 = @%--but then
         * how will an ordinary MD-5 sum be matched?
         * There is no way to standardize text to something
         * like UTF-8 before transformation; speed cost is
         * utterly prohibitive. The JavaScript standard
         * itself needs to look at this: it should start
         * providing access to strings as preformed UTF-8
         * 8-bit unsigned value arrays.
         */
        md5blk = (s) => { /* I figured global was faster.   */
        var md5blks = [], i; /* Andy King said do it this way. */
        for (i=0; i<64; i+=4) {
        md5blks[i>>2] = s.charCodeAt(i)
        + (s.charCodeAt(i+1) << 8)
        + (s.charCodeAt(i+2) << 16)
        + (s.charCodeAt(i+3) << 24);
        }
        return md5blks;
        }
        
        var hex_chr = '0123456789abcdef'.split('');
        
        rhex = (n) =>
        {
        var s='', j=0;
        for(; j<4; j++)
        s += hex_chr[(n >> (j * 8 + 4)) & 0x0F]
        + hex_chr[(n >> (j * 8)) & 0x0F];
        return s;
        }
        
        hex = (x) => {
        for (var i=0; i<x.length; i++)
        x[i] = rhex(x[i]);
        return x.join('');
        }
        
        md5 = (s) => {
        return hex(md51(s));
        }
        
        /* this is much faster,
        so if possible we use it. Some IEs
        are the only ones I know of that
        need the idiotic second function,
        generated by an if clause.  */
        
        add32 = (a, b) => {
        return (a + b) & 0xFFFFFFFF;
        }

        if (md5('hello') != '5d41402abc4b2a76b9719d911017c592') {
        add32 = (x, y) => {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
        msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
        }
        }

        return md5(inputString);
}

// Based on the hashing algorithm used in FingerprintJS v3.3.3 by Fingerprint Inc,
// which itself is based on MurmurHash3 by Karan Lyons
// FingerprintJS: https://github.com/fingerprintjs/fingerprintjs
// MurmurHash3: https://github.com/karanlyons/murmurHash3.js
// Minified code
fingerprintJsHash = (inputString)=>{
    c = (e, t) => {
        e = [e[0] >>> 16, 65535 & e[0], e[1] >>> 16, 65535 & e[1]],
        t = [t[0] >>> 16, 65535 & t[0], t[1] >>> 16, 65535 & t[1]];
        var n = [0, 0, 0, 0];
        return n[3] += e[3] + t[3],
        n[2] += n[3] >>> 16,
        n[3] &= 65535,
        n[2] += e[2] + t[2],
        n[1] += n[2] >>> 16,
        n[2] &= 65535,
        n[1] += e[1] + t[1],
        n[0] += n[1] >>> 16,
        n[1] &= 65535,
        n[0] += e[0] + t[0],
        n[0] &= 65535,
        [n[0] << 16 | n[1], n[2] << 16 | n[3]]
    }
    u = (e, t) => {
        e = [e[0] >>> 16, 65535 & e[0], e[1] >>> 16, 65535 & e[1]],
        t = [t[0] >>> 16, 65535 & t[0], t[1] >>> 16, 65535 & t[1]];
        var n = [0, 0, 0, 0];
        return n[3] += e[3] * t[3],
        n[2] += n[3] >>> 16,
        n[3] &= 65535,
        n[2] += e[2] * t[3],
        n[1] += n[2] >>> 16,
        n[2] &= 65535,
        n[2] += e[3] * t[2],
        n[1] += n[2] >>> 16,
        n[2] &= 65535,
        n[1] += e[1] * t[3],
        n[0] += n[1] >>> 16,
        n[1] &= 65535,
        n[1] += e[2] * t[2],
        n[0] += n[1] >>> 16,
        n[1] &= 65535,
        n[1] += e[3] * t[1],
        n[0] += n[1] >>> 16,
        n[1] &= 65535,
        n[0] += e[0] * t[3] + e[1] * t[2] + e[2] * t[1] + e[3] * t[0],
        n[0] &= 65535,
        [n[0] << 16 | n[1], n[2] << 16 | n[3]]
    }
    s = (e, t) => {
        return 32 === (t %= 64) ? [e[1], e[0]] : t < 32 ? [e[0] << t | e[1] >>> 32 - t, e[1] << t | e[0] >>> 32 - t] : (t -= 32,
        [e[1] << t | e[0] >>> 32 - t, e[0] << t | e[1] >>> 32 - t])
    }
    l = (e, t) => {
        return 0 === (t %= 64) ? e : t < 32 ? [e[0] << t | e[1] >>> 32 - t, e[1] << t] : [e[1] << t - 32, 0]
    }
    d = (e, t) => {
        return [e[0] ^ t[0], e[1] ^ t[1]]
    }
    f = (e) => {
        return e = d(e, [0, e[0] >>> 1]),
        e = d(e = u(e, [4283543511, 3981806797]), [0, e[0] >>> 1]),
        e = d(e = u(e, [3301882366, 444984403]), [0, e[0] >>> 1])
    }
	h = (e, t) => {
        t = t || 0;
        var n, r = (e = e || "").length % 16, a = e.length - r, o = [0, t], i = [0, t], h = [0, 0], v = [0, 0], p = [2277735313, 289559509], m = [1291169091, 658871167];
        for (n = 0; n < a; n += 16)
            h = [255 & e.charCodeAt(n + 4) | (255 & e.charCodeAt(n + 5)) << 8 | (255 & e.charCodeAt(n + 6)) << 16 | (255 & e.charCodeAt(n + 7)) << 24, 255 & e.charCodeAt(n) | (255 & e.charCodeAt(n + 1)) << 8 | (255 & e.charCodeAt(n + 2)) << 16 | (255 & e.charCodeAt(n + 3)) << 24],
            v = [255 & e.charCodeAt(n + 12) | (255 & e.charCodeAt(n + 13)) << 8 | (255 & e.charCodeAt(n + 14)) << 16 | (255 & e.charCodeAt(n + 15)) << 24, 255 & e.charCodeAt(n + 8) | (255 & e.charCodeAt(n + 9)) << 8 | (255 & e.charCodeAt(n + 10)) << 16 | (255 & e.charCodeAt(n + 11)) << 24],
            h = s(h = u(h, p), 31),
            o = c(o = s(o = d(o, h = u(h, m)), 27), i),
            o = c(u(o, [0, 5]), [0, 1390208809]),
            v = s(v = u(v, m), 33),
            i = c(i = s(i = d(i, v = u(v, p)), 31), o),
            i = c(u(i, [0, 5]), [0, 944331445]);
        switch (h = [0, 0],
        v = [0, 0],
        r) {
        case 15:
            v = d(v, l([0, e.charCodeAt(n + 14)], 48));
        case 14:
            v = d(v, l([0, e.charCodeAt(n + 13)], 40));
        case 13:
            v = d(v, l([0, e.charCodeAt(n + 12)], 32));
        case 12:
            v = d(v, l([0, e.charCodeAt(n + 11)], 24));
        case 11:
            v = d(v, l([0, e.charCodeAt(n + 10)], 16));
        case 10:
            v = d(v, l([0, e.charCodeAt(n + 9)], 8));
        case 9:
            v = u(v = d(v, [0, e.charCodeAt(n + 8)]), m),
            i = d(i, v = u(v = s(v, 33), p));
        case 8:
            h = d(h, l([0, e.charCodeAt(n + 7)], 56));
        case 7:
            h = d(h, l([0, e.charCodeAt(n + 6)], 48));
        case 6:
            h = d(h, l([0, e.charCodeAt(n + 5)], 40));
        case 5:
            h = d(h, l([0, e.charCodeAt(n + 4)], 32));
        case 4:
            h = d(h, l([0, e.charCodeAt(n + 3)], 24));
        case 3:
            h = d(h, l([0, e.charCodeAt(n + 2)], 16));
        case 2:
            h = d(h, l([0, e.charCodeAt(n + 1)], 8));
        case 1:
            h = u(h = d(h, [0, e.charCodeAt(n)]), p),
            o = d(o, h = u(h = s(h, 31), m))
        }
        return o = c(o = d(o, [0, e.length]), i = d(i, [0, e.length])),
        i = c(i, o),
        o = c(o = f(o), i = f(i)),
        i = c(i, o),
        ("00000000" + (o[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (o[1] >>> 0).toString(16)).slice(-8) + ("00000000" + (i[0] >>> 0).toString(16)).slice(-8) + ("00000000" + (i[1] >>> 0).toString(16)).slice(-8)
    }

	return h(inputString);
}

// Based on the hashing algorithm used in fingerprinting script found by
// FpFlow (https://github.com/FPFlow/FPFlow-project)
// Originally at: https://wl.jd.com/wl.js
// Stored at FpFlow: https://github.com/FPFlow/FPFlow-project/blob/master/scripts/4.formatted.js
// Minified code
fpFlow4Hash = (inputString)=>{

    MD5 = {
        chrsz: 8,
        G: "",
        hex_md5: function(e) {
            return this.binl2hex(this.core_md5(this.str2binl(e), e.length * this.chrsz))
        },
        core_md5: function(e, t) {
            e[t >> 5] |= 128 << t % 32, e[14 + (t + 64 >>> 9 << 4)] = t;
            for (var r = 1732584193, n = -271733879, i = -1732584194, o = 271733878, a = 0; a < e.length; a += 16) {
                var d = r,
                    s = n,
                    c = i,
                    u = o;
                r = this.md5_ff(r, n, i, o, e[a + 0], 7, -680876936), o = this.md5_ff(o, r, n, i, e[a + 1], 12, -389564586), i = this.md5_ff(i, o, r, n, e[a + 2], 17, 606105819), n = this.md5_ff(n, i, o, r, e[a + 3], 22, -1044525330), r = this.md5_ff(r, n, i, o, e[a + 4], 7, -176418897), o = this.md5_ff(o, r, n, i, e[a + 5], 12, 1200080426), i = this.md5_ff(i, o, r, n, e[a + 6], 17, -1473231341), n = this.md5_ff(n, i, o, r, e[a + 7], 22, -45705983), r = this.md5_ff(r, n, i, o, e[a + 8], 7, 1770035416), o = this.md5_ff(o, r, n, i, e[a + 9], 12, -1958414417), i = this.md5_ff(i, o, r, n, e[a + 10], 17, -42063), n = this.md5_ff(n, i, o, r, e[a + 11], 22, -1990404162), r = this.md5_ff(r, n, i, o, e[a + 12], 7, 1804603682), o = this.md5_ff(o, r, n, i, e[a + 13], 12, -40341101), i = this.md5_ff(i, o, r, n, e[a + 14], 17, -1502002290), n = this.md5_ff(n, i, o, r, e[a + 15], 22, 1236535329), r = this.md5_gg(r, n, i, o, e[a + 1], 5, -165796510), o = this.md5_gg(o, r, n, i, e[a + 6], 9, -1069501632), i = this.md5_gg(i, o, r, n, e[a + 11], 14, 643717713), n = this.md5_gg(n, i, o, r, e[a + 0], 20, -373897302), r = this.md5_gg(r, n, i, o, e[a + 5], 5, -701558691), o = this.md5_gg(o, r, n, i, e[a + 10], 9, 38016083), i = this.md5_gg(i, o, r, n, e[a + 15], 14, -660478335), n = this.md5_gg(n, i, o, r, e[a + 4], 20, -405537848), r = this.md5_gg(r, n, i, o, e[a + 9], 5, 568446438), o = this.md5_gg(o, r, n, i, e[a + 14], 9, -1019803690), i = this.md5_gg(i, o, r, n, e[a + 3], 14, -187363961), n = this.md5_gg(n, i, o, r, e[a + 8], 20, 1163531501), r = this.md5_gg(r, n, i, o, e[a + 13], 5, -1444681467), o = this.md5_gg(o, r, n, i, e[a + 2], 9, -51403784), i = this.md5_gg(i, o, r, n, e[a + 7], 14, 1735328473), n = this.md5_gg(n, i, o, r, e[a + 12], 20, -1926607734), r = this.md5_hh(r, n, i, o, e[a + 5], 4, -378558), o = this.md5_hh(o, r, n, i, e[a + 8], 11, -2022574463), i = this.md5_hh(i, o, r, n, e[a + 11], 16, 1839030562), n = this.md5_hh(n, i, o, r, e[a + 14], 23, -35309556), r = this.md5_hh(r, n, i, o, e[a + 1], 4, -1530992060), o = this.md5_hh(o, r, n, i, e[a + 4], 11, 1272893353), i = this.md5_hh(i, o, r, n, e[a + 7], 16, -155497632), n = this.md5_hh(n, i, o, r, e[a + 10], 23, -1094730640), r = this.md5_hh(r, n, i, o, e[a + 13], 4, 681279174), o = this.md5_hh(o, r, n, i, e[a + 0], 11, -358537222), i = this.md5_hh(i, o, r, n, e[a + 3], 16, -722521979), n = this.md5_hh(n, i, o, r, e[a + 6], 23, 76029189), r = this.md5_hh(r, n, i, o, e[a + 9], 4, -640364487), o = this.md5_hh(o, r, n, i, e[a + 12], 11, -421815835), i = this.md5_hh(i, o, r, n, e[a + 15], 16, 530742520), n = this.md5_hh(n, i, o, r, e[a + 2], 23, -995338651), r = this.md5_ii(r, n, i, o, e[a + 0], 6, -198630844), o = this.md5_ii(o, r, n, i, e[a + 7], 10, 1126891415), i = this.md5_ii(i, o, r, n, e[a + 14], 15, -1416354905), n = this.md5_ii(n, i, o, r, e[a + 5], 21, -57434055), r = this.md5_ii(r, n, i, o, e[a + 12], 6, 1700485571), o = this.md5_ii(o, r, n, i, e[a + 3], 10, -1894986606), i = this.md5_ii(i, o, r, n, e[a + 10], 15, -1051523), n = this.md5_ii(n, i, o, r, e[a + 1], 21, -2054922799), r = this.md5_ii(r, n, i, o, e[a + 8], 6, 1873313359), o = this.md5_ii(o, r, n, i, e[a + 15], 10, -30611744), i = this.md5_ii(i, o, r, n, e[a + 6], 15, -1560198380), n = this.md5_ii(n, i, o, r, e[a + 13], 21, 1309151649), r = this.md5_ii(r, n, i, o, e[a + 4], 6, -145523070), o = this.md5_ii(o, r, n, i, e[a + 11], 10, -1120210379), i = this.md5_ii(i, o, r, n, e[a + 2], 15, 718787259), n = this.md5_ii(n, i, o, r, e[a + 9], 21, -343485551), r = this.safe_add(r, d), n = this.safe_add(n, s), i = this.safe_add(i, c), o = this.safe_add(o, u)
            }
            return Array(r, n, i, o)
        },
        md5_cmn: function(e, t, r, n, i, o) {
            return this.safe_add(this.bit_rol(this.safe_add(this.safe_add(t, e), this.safe_add(n, o)), i), r)
        },
        md5_ff: function(e, t, r, n, i, o, a) {
            return this.md5_cmn(t & r | ~t & n, e, t, i, o, a)
        },
        md5_gg: function(e, t, r, n, i, o, a) {
            return this.md5_cmn(t & n | r & ~n, e, t, i, o, a)
        },
        md5_hh: function(e, t, r, n, i, o, a) {
            return this.md5_cmn(t ^ r ^ n, e, t, i, o, a)
        },
        md5_ii: function(e, t, r, n, i, o, a) {
            return this.md5_cmn(r ^ (t | ~n), e, t, i, o, a)
        },
        safe_add: function(e, t) {
            var r = (65535 & e) + (65535 & t);
            return (e >> 16) + (t >> 16) + (r >> 16) << 16 | 65535 & r
        },
        bit_rol: function(e, t) {
            return e << t | e >>> 32 - t
        },
        str2binl: function(e) {
            for (var t = Array(), r = (1 << this.chrsz) - 1, n = 0; n < e.length * this.chrsz; n += this.chrsz) t[n >> 5] |= (e.charCodeAt(n / this.chrsz) & r) << n % 32;
            return t
        },
        binl2hex: function(e) {
            for (var t = "0123456789abcdef", r = "", n = 0; n < 4 * e.length; n++) r += t.charAt(e[n >> 2] >> n % 4 * 8 + 4 & 15) + t.charAt(e[n >> 2] >> n % 4 * 8 & 15);
            return r
        }
    }

    return MD5.hex_md5(inputString);
}


hashTaintTest = (hashFunction) => {
    var s = randomTaintedString() + randomTaintedString() + randomTaintedString();
    assertTainted(hashFunction(s));
}

noHashtest = () => {
    hashTaintTest(noHash);
}

simpleHashtest = () => {
    hashTaintTest(simpleHash);
}

md5Hashtest = () => {
    hashTaintTest(md5Hash);
}

fingerprintHashtest = () => {
    hashTaintTest(fingerprintJsHash);
}

fpFlow4HashTest = () => {
    hashTaintTest(fpFlow4Hash);
}

runTaintTest(noHashtest);
runTaintTest(simpleHashtest);
runTaintTest(md5Hashtest);
runTaintTest(fingerprintHashtest);
runTaintTest(fpFlow4HashTest);


if (typeof reportCompare === 'function')
    reportCompare(true, true);
