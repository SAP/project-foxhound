// Test interaction of gray marking / cross zone pointers / aborted GC marking.

gczeal(0);

gc();
assertEq(grayBitsValid(), true);

// Create some globals in different zones.
let g1 = newGlobal({newCompartment: true});
let g2 = newGlobal({newCompartment: true});
let g3 = newGlobal({newCompartment: true});

// Set up a linked list of objects in different zones: a --> b --> c
g1.eval('var a = {}');
g2.eval('var b = {}');
g3.eval('var c = {}');
g1.a.next = g2.b;
g2.b.next = g3.c;

// Observe mark state of the objects and remove extra references from the globals.
g1.eval('addMarkObservers([a])');
g2.eval('addMarkObservers([b])');
g3.eval('addMarkObservers([c])');
g2.b = undefined;
g3.c = undefined;

function checkMarks(a, b, c) {
  assertEq(getMarks().join(", "), [a, b, c].join(", "));
}

// Check GC initially marks everything black.
gc();
checkMarks("black", "black", "black");

// Replace root with a gray one and check GC marks everything gray.
g1.eval('grayRoot()[0] = a');
g1.a = undefined;
gc();
checkMarks("gray", "gray", "gray");

// Read the gray root and check gray unmarking marks everything black again.
g1.eval('grayRoot()[0]');
checkMarks("black", "black", "black");

// Reset everything to gray.
gc();
checkMarks("gray", "gray", "gray");

// Start marking zone 2.
schedulezone(g2);
startgc(10);
while (gcstate() === "Prepare" || gcstate() === "MarkRoots") {
  gcslice(10);
}
assertEq(gcstate(), "Mark");
assertEq(gcstate(g1), "NoGC");
assertEq(gcstate(g2), "MarkBlackOnly");
assertEq(gcstate(g3), "NoGC");

// Check zone 2's mark bits have been cleared.
checkMarks("gray", "unmarked", "gray");

// Gray unmarking stops at the zone that is being mraked
g1.eval('grayRoot()[0]');
checkMarks("black", "black", "gray");

// GC marking handles the gray unmarking by propagaing b's mark state.
finishgc();
assertEq(grayBitsValid(), true);
checkMarks("black", "black", "black");

// Reset everything to gray.
gc();
checkMarks("gray", "gray", "gray");

// Repeat the previous test but abort marking after unmarking a. c is
// left as 'gray' (incorrect) but the gray marking state is marked as invalid.
schedulezone(g2);
startgc(10);
while (gcstate() === "Prepare" || gcstate() === "MarkRoots") {
  gcslice(10);
}
assertEq(gcstate(), "Mark");
checkMarks("gray", "unmarked", "gray");
g1.eval('grayRoot()[0]');
assertEq(grayBitsValid(), true);
abortgc();
assertEq(grayBitsValid(), false);
checkMarks("black", "black", "gray");

gc();
checkMarks("gray", "gray", "gray");
