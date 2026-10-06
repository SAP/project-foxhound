function checkMarks(expected) {
  assertEq(getMarks().join(", "), expected.join(", "));
}

gczeal(0);
gczeal('CheckGrayMarking');
gc();

let g1 = newGlobal({newCompartment: true});
let g2 = newGlobal({newCompartment: true});
let makeAndReturnObject = `
  var o = {};
  addMarkObservers([o]);
  grayRoot()[0] = o;
  o;
`;
let o1 = g1.eval(makeAndReturnObject);
let o2 = g2.eval(makeAndReturnObject);
let s = Symbol();
addMarkObservers([s]);
let i = getAtomMarkIndex(s);
o1.s = s;
o2.s = s;
o1 = undefined;
o2 = undefined;
s = undefined;
g1.o = undefined;
g2.o = undefined;

gc();
checkMarks(['gray', 'gray', 'gray']);
assertEq(getAtomMarkColor(g1, i), 'gray');
assertEq(getAtomMarkColor(g2, i), 'gray');

o1 = g1.eval('grayRoot()[0]');
checkMarks(['black', 'gray', 'black']);
assertEq(getAtomMarkColor(g1, i), 'black');
assertEq(getAtomMarkColor(g2, i), 'gray');

o2 = g2.eval('grayRoot()[0]');
checkMarks(['black', 'black', 'black']);
assertEq(getAtomMarkColor(g1, i), 'black');
assertEq(getAtomMarkColor(g2, i), 'black');

o1 = undefined;
schedulezone(this);
schedulezone(g1);
schedulezone('atoms');
startgc();
assertEq(gcstate(), 'NotActive');

checkMarks(['gray', 'black', 'black']);
assertEq(getAtomMarkColor(g1, i), 'gray');
assertEq(getAtomMarkColor(g2, i), 'black');
