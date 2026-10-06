// |jit-test| --setpref=objectfuse_for_global=true

function markConstant(obj, key) {
  assertEq(getObjectFuseState(obj).properties[key], "Untracked");
  // This relies on the fact that storing to an Untracked property marks it
  // Constant. Use getOwnPropertyDescriptor to prevent interacting with JIT
  // optimizations.
  obj[key] = Object.getOwnPropertyDescriptor(obj, key).value;
}
function testGlobal() {
  var g = newGlobal({sameCompartmentAs: this, useWindowProxy: false});
  addObjectFuse(g);
  assertEq(getObjectFuseState(g).generation, 0);

  // Ensure global variables are marked untracked or constant.
  g.evaluate("var foo = 1; var bar; bar = function() {}; function baz() {};");
  var state = getObjectFuseState(g);
  assertEq(state.properties.foo, "Constant");
  assertEq(state.properties.bar, "Constant");
  assertEq(state.properties.baz, "Untracked");

  // Shadowing a non-constant global on the lexical environment doesn't change
  // the generation.
  g.evaluate("let Object = {};");
  assertEq(getObjectFuseState(g).generation, 0);

  // Shadowing a constant property does change the generation.
  markConstant(g, "Function");
  g.evaluate("let Function = {};");
  assertEq(getObjectFuseState(g).generation, 1);

  // Shadowing a no-longer-constant property must also change the generation because
  // IC stubs may still have guards for this property.
  g.Math = 1;
  g.Math = 2;
  g.evaluate("let Math = {};");
  assertEq(getObjectFuseState(g).generation, 2);
}
testGlobal();
testGlobal();
