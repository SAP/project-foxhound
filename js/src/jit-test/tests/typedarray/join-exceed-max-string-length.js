load(libdir + "asserts.js");

// Reserving more memory than `JSString::MAX_LENGTH` in StringBuilder throws an
// InternalError right away.
//
// Test using `join` which will attempt to reserve
// `typedarray.length + max(separator.length * (typedarray.length - 1), 0)`
// characters.

// Large typed array with a small separator string.
var large = new Int8Array(1024 ** 3);
assertThrowsInstanceOf(() => large.join(""), InternalError);
assertThrowsInstanceOf(() => large.join(","), InternalError);

// Small typed array with a large separator string.
var sep = ",".repeat(1 << 21);
var small = new Int8Array(1024);
assertThrowsInstanceOf(() => small.join(sep), InternalError);
