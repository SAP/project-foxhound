
// (1) arguments.length as the head of an optional chain.

// (1a) ?. property access.
function optDot() { return arguments.length?.foo; }
assertEq(optDot(), undefined);
assertEq(optDot(1, 2, 3), undefined);

// (1b) ?.[] element access.
function optElem() { return arguments.length?.["toString"]; }
assertEq(typeof optElem(1, 2), "function");

// (1c) ?.() call. arguments.length is a number, so calling it throws
// TypeError (not ReferenceError) and never reads |arguments| itself.
function optCall() {
  try {
    arguments.length?.();
    return "no throw";
  } catch (e) {
    return e.constructor.name;
  }
}
assertEq(optCall(), "TypeError");

// (1d) The optimization must still produce the correct count, not read an
// enclosing |arguments|. inner() takes zero arguments regardless of outer's.
function outer() {
  function inner() { return arguments.length?.toString(); }
  return inner();
}
assertEq(outer(1, 2, 3, 4, 5), "0");

// (1e) Longer optional chains still produce the right count.
function optChain() { return arguments.length?.toString?.(); }
assertEq(optChain(1, 2, 3), "3");

function optChainElemCall() { return arguments.length?.["toString"]?.(); }
assertEq(optChainElemCall(1, 2), "2");

function optChainParens() { return (arguments.length)?.toString(); }
assertEq(optChainParens(1, 2, 3, 4), "4");

function outerChain() {
  function inner() { return arguments.length?.toString?.(); }
  return inner();
}
assertEq(outerChain(1, 2, 3, 4, 5), "0");

// (2) Non-optional call of arguments.length. Same elided-binding hazard:
// the callee must be the number, yielding TypeError rather than ReferenceError.
function nonOptCall() {
  try {
    arguments.length();
    return "no throw";
  } catch (e) {
    return e.constructor.name;
  }
}
assertEq(nonOptCall(), "TypeError");

// (3) arguments.length as a destructuring-assignment target. The binding must
// not be elided here, since the write needs a real |arguments| object.

// (3a) Array pattern.
function destrArray(a, b, c) {
  [arguments.length] = [99];
  return arguments.length;
}
assertEq(destrArray(1, 2, 3), 99);

// (3b) Object pattern.
function destrObject(a, b) {
  ({ p: arguments.length } = { p: 42 });
  return arguments.length;
}
assertEq(destrObject(1, 2), 42);

// (3c) for-of with a destructuring pattern target.
function destrForOf(a) {
  for ([arguments.length] of [[7]]) {
  }
  return arguments.length;
}
assertEq(destrForOf(1), 7);

// (3d) Nested / mixed pattern.
function destrNested(a, b, c, d) {
  [, arguments.length] = [1, 5];
  return arguments.length;
}
assertEq(destrNested(1, 2, 3, 4), 5);

// (4) Plain reads still take the fast path and return the correct value.
function plainRead(a, b, c) { return arguments.length; }
assertEq(plainRead(1, 2, 3), 3);
