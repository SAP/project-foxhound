// |jit-test| allow-overrecursed

// Test super() and super.foo() calls in deeply nested eval.

class C {
    constructor(x) { this.x = x; }
    foo() { this.x++; }
}
class D extends C {
    constructor(depth) {
        var d = depth;
        var callsuper = 'super(depth); super.foo();';
        var s = "var q; if (d-- > 0) { eval(s) } else { eval(callsuper); }";
        eval(s);
    }
}

// These values should work.
var depths = [0, 1, 10, 200, 300];
for (var d of depths) {
    var o = new D(d);
    assertEq(o.x, d + 1);
}

// When we use a large enough depth that we run out of stack, we throw instead
// of crashing
var ex;
try {
    new D(2000);
} catch(e) {
    ex = e;
}
assertEq(ex instanceof InternalError, true);
