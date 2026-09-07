function checkMarks(expected) {
  assertEq(getMarks().join(", "), expected.join(", "));
}

gczeal(0);
gczeal('CheckGrayMarking');
gc();

let g1 = newGlobal({newCompartment: true});
let g2 = newGlobal({newCompartment: true});
let defineTestFunction = `
  function makeTestObject(s) {
    let o = {x: s};
    addMarkObservers([o]);
    grayRoot()[0] = o;
    o = undefined;
  }
  `;
g1.eval(defineTestFunction);
g2.eval(defineTestFunction);

let s = Symbol();
g1.makeTestObject(s);
g2.makeTestObject(s);
addMarkObservers([s]);
s = undefined;

checkMarks(['unmarked', 'unmarked', 'unmarked']);

schedulezone(g1);
startgc();
finishgc();
checkMarks(['gray', 'unmarked', 'unmarked']);

g2.eval('grayRoot()[0].x');
checkMarks(['gray', 'unmarked', 'unmarked']);

gc();
checkMarks(['gray', 'gray', 'gray']);
