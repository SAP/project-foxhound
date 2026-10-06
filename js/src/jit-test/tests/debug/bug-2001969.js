// |jit-test| --fuzzing-safe; --ion-offthread-compile=off; --baseline-warmup-threshold=0; error: ReferenceError

gczeal(2, 5);
function assertOffsetColumns(code) {
  const global = newGlobal({newCompartment: true});
  const lines = code.split(/\r?\n|\r]/g);
  const execCode = lines[lines.length - 1];
  global.eval(execCode);
  const dbg = new Debugger;
  let debuggeeFn = dbg.addDebuggee(global).makeDebuggeeValue(global.f);
  const { script } = debuggeeFn;
  for (const offset of script.getAllColumnOffsets()) {
    script.setBreakpoint(offset.offset, {});
  }
  global.f(3);
  throw new Error(`Assertion failed: ${foo}`);
}
assertOffsetColumns("function f(){}")
