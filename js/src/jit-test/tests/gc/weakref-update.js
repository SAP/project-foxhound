var g = newGlobal({newCompartment: true});
var t = transplantableObject();
var src = t.object;
gc();
var w = new WeakRef(src);
t.transplant(g);
minorgc();
var d = w.deref();
print(d);
