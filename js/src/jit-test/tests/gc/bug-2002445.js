var x = newGlobal({
  newCompartment: true,
});
x.parent = [];
x.eval(
  '(function () { Debugger(parent).onEnterFrame = function (y) { y.eval(""); }; })();',
);
function f() {
  (() => {
    this;
  });
  oomTest(f);
}
for (var i = 0; i < 99; i++) {
  f();
}
