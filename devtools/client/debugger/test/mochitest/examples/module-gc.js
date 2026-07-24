import stuff from "./module-gc2.js";

var x = 10;

export function moduleFunction() {
  stuff(x);
}

// GC the module scripts so the Debugger has to reparse (see bug 1605686)
setTimeout(() => SpecialPowers.gc(), 0);
