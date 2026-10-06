// |jit-test| --no-jit-backend

const g = newGlobal({ newCompartment: true });
const dbg = Debugger();
const gdbg = dbg.addDebuggee(g);

gdbg.createSource({ text: "" });
gdbg.createSource({ text: "", forceEnableAsmJS: false });

let caught = false;
try {
  gdbg.createSource({ text: "", forceEnableAsmJS: true });
} catch {
  caught = true;
}
assertEq(caught, true);
