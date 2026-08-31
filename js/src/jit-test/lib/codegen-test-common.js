// Set to true to emit ' +' instead of the unreadable '\s+'.
var SPACEDEBUG = false;

// Any hex string
var HEX = '[0-9a-fA-F]'
var HEXES = `${HEX}+`;

function wrap(options, funcs) {
    if ('memory' in options)
        return `(module (memory ${options.memory}) ${funcs})`;
    return `(module ${funcs})`;
}

function fixlines(s) {
    return s.split(/\n+/)
        .map(strip)
        .filter(x => x.length > 0)
        .map(spaces)
        .join('\n');
}

function stripencoding(s, insEncoding) {
    var encoding = RegExp(`^(?:0x)?${HEX}+\\s+${insEncoding}\\s+(.*)$`);
    return s.split('\n')
        .map(x => x.match(encoding)?.[1] ?? x)
        .join('\n');
}

function strip(s) {
    var start = 0, end = s.length;
    while (start < s.length && isspace(s.charAt(start)))
        start++;
    while (end > start && isspace(s.charAt(end - 1)))
        end--;
    return s.substring(start, end);
}

function striplines(s) {
    return s.split('\n').map(strip).join('\n');
}

function spaces(s) {
    let t = '';
    let i = 0;
    while (i < s.length) {
        if (isspace(s.charAt(i))) {
            t += SPACEDEBUG ? ' +' : '\\s+';
            i++;
            while (i < s.length && isspace(s.charAt(i)))
                i++;
        } else {
            t += s.charAt(i++);
        }
    }
    return t;
}

function isspace(c) {
    return c == ' ' || c == '\t';
}
