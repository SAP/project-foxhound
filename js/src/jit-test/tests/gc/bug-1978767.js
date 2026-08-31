// |jit-test| error: TypeError
a = [];
for (b = 0; b < 20; b++) {
    a.push(b);
}
minorgc();
Object.defineProperty(a, "length", {
    writable: false
}).shift();
