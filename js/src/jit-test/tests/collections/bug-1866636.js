// |jit-test| --enable-symbols-as-weakmap-keys
b = new WeakMap();
c = Symbol();
b.set(c);
c = gczeal(10);
for (i=0; i<1000; ++i) {
    try {
        x;
    } catch {}
}
