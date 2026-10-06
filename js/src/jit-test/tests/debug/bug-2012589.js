// |jit-test| error: Error

const g = newGlobal({newCompartment: true});
g.enableShellAllocationMetadataBuilder();
const dbg = new Debugger();
dbg.memory.trackingAllocationSites = true;
dbg.addDebuggee(g);
