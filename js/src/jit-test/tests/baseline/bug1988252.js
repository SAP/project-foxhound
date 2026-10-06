// |jit-test| --baseline-warmup-threshold=1000

let s = `
function bar() {}
function foo() {
  for (var i = 0; i < 1000; i++) {
    bar();
  }
  let o = {};
`;
for (var i = 0; i < 100000; i++) {
  s += "  o.x = 1;"
}
s += "}"

eval(s);
foo();
