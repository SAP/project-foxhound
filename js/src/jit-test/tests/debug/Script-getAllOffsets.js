var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);

g.eval(`function f(o) {
  o.a=1;
  o.b=2;
  o.c=3;
  o.d=4;
  o.e=5;
  o.f=6;
  o.g=7;
  o.h=8;
  o.i=9;
  o.j=10;
  o.k=11;
  o.l=12;
  o.m=13;
  o.n=14;
  o.o=15;
  o.p=16;
  o.q=17;
  o.r=18;
  o.s=19;
  o.t=20;
  return o;
}`);
var s = dbg.findScripts().find(s => s.displayName === "f");
s.getAllOffsets();
dbg.removeAllDebuggees();
gczeal(14, 2);
// The function f should not be relazified.
s.getAllOffsets();
