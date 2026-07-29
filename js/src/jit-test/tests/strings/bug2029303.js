for (let i = 0; i < 20; i++) {
  var O = new WeakRef(new Uint8Array(3));

  var M = newString("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop", {
    capacity: 5000,
    tenured: true,
  });
  var T = newDependentString(M, 2, 30, { tenured: true });

  var root = newRope(M, "qrstuvwxyz0123456789", { nursery: true });
  ensureLinearString(root);

  O.slot = root;

  var rope2 = newRope(root, "X".repeat(4000), { nursery: true });
  ensureLinearString(rope2);

  Math.atan(0, "M", M, "root", root, "rope2", rope2, "T", T);

  rope2 = null;
  root = null;
  M = null;

  minorgc();

  print(i, "T = '" + T + "'");
  if (globalThis.stringRepresentation) {
    stringRepresentation(T); // Trigger assert about string data offset.
  }
}
