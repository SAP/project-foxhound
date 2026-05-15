// Check gray unmarking running as part of incremental GC correctly unmarks
// edges traced via virtual dispatch on the marking tracer.

function checkMarks(expected) {
  assertEq(getMarks().join(", "), expected.join(", "));
}

gczeal(0);
gczeal('CheckGrayMarking');
gc();

let s = Symbol();
addMarkObservers([s]);

let m = new Map();
m.set({}, s);
addMarkObservers([m]);
grayRoot()[0] = m;

s = undefined;
m = undefined;
gc();
checkMarks(['gray', 'gray']);

schedulezone(this);
startgc(1);
while (gcstate() === 'Prepare') {
  gcslice(10);
}
print(gcstate());
m = grayRoot()[0];
finishgc();
checkMarks(['black', 'black']);
