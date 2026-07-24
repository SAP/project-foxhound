// |jit-test|

load(libdir + "asserts.js");

function assert(x)
{
    if (x){
        return;
    }
    throw new Error("assertion failed");
}

function f() { return saveStack(); }
function g() { return f(); }

let stack = g();
let clonebuf = serialize(stack, undefined, {scope: "DifferentProcess"});
let data = clonebuf.clonebuffer;

let boolPattern = String.fromCharCode(0x02, 0x00, 0xFF, 0xFF);
let boolIndex = data.indexOf(boolPattern);
assert(boolIndex >= 0);

let stringPattern = String.fromCharCode(0x04, 0x00, 0xFF, 0xFF);
let stringIndex = data.indexOf(stringPattern, boolIndex + 8);
assert(stringIndex >= 0);

// SCTAG_STRING -> SCTAG_INT32
let corrupted = data.substring(0, stringIndex) +
                    String.fromCharCode(0x03, 0x00, 0xFF, 0xFF) +
                    data.substring(stringIndex + 4);

let buf = serialize("dummy");
buf.clonebuffer = corrupted;

assertThrowsInstanceOf(() => deserialize(buf), Error);
