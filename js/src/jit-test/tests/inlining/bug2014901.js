var objs = [{x: 1}, {x: 1, y: 2}];
function inlined(i) {
  // Polymorphic to force trial inlining.
  return objs[i & 1].x;
}
function callFunction(f, arg) {
  f(arg);
}
function recurse(depth) {
  if (depth > 30) {
    // Trigger trial inlining of the callFunction => inlined call.
    for (var i = 0; i < 1000; i++) {
      callFunction(inlined, i);
    }
  } else {
    callFunction(recurse, depth + 1);
  }
  if (depth % 15 === 0) {
    gc(this, "shrinking");
  }
}
recurse(0);
recurse(0);
