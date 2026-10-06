// |jit-test| exitstatus: 3
enqueueMark('set-color-gray');
setMarkStackLimit(1);
a = newGlobal({ newCompartment: true });
b = new Debugger;
b.addDebuggee(a)
gczeal(11);
gczeal(9, 6) = c;
