// Exercise post minor collection GC hash table checks with nursery pointers,
// in this cases a prototype that survives collection but stays allocated in
// the nursery.

gczeal(0);
gcparam("semispaceNurseryEnabled", 1);
gc();
gczeal(7);
gczeal(13);

var keep = [];
for (var i = 0; i < 500; i++) {
  var proto = {};
  proto.a = i;
  // Object.create installs |proto| (a nursery object) into the new object's
  // BaseShape, adding an entry to the per-zone baseShapes table.
  keep.push(Object.create(proto), proto);
}
