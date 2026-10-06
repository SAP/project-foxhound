// |jit-test| --fast-warmup; --no-threads; --ion-limit-script-size=off
function f() {}
for (let i = 0; i < 10; i++) {
  f();
}
let g1 = Function("return f(" + "0,".repeat(21000) + "0)");
let g2 = Function("return f.call(" + "0,".repeat(21000) + "0)");
for (let i = 0; i < 500; i++) {
  g1();
  g2();
}
