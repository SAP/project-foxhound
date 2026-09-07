function simple() {
  const obj = { foo: 1, bar: 2 };
  const func = foo(3, 4);
  const result = func();
  return result;
}

function nestedA() {
  nestedB();
}

function nestedB() {
  nestedC();
}

function nestedC() {
  debugger;
  return 1;
}
