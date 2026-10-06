// |jit-test| error:InternalError; test-also=--ion-regalloc=simple
function f() {
  f.apply(this|0, new Array());
}
f();
