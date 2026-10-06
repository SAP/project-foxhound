newGlobal().eval(`
function f() {
  try {
    f();
  } catch {
    Object.keys({});
  }
}
f();
`);
