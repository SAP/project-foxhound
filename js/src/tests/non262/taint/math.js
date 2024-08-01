function absNumberTaintingTest(){
    var a = taint(42);
    var b = taint(-42);
    assertNumberTainted(Math.abs(a));
    assertNumberTainted(Math.abs(b));
    assertEq(42, Math.abs(a));
    assertEq(42, Math.abs(b));
}

function acosNumberTaintingTest(){
    var a = taint(0.5);
    assertNumberTainted(Math.acos(a));
    assertNear(Math.PI / 3, Math.acos(a));
}

function acoshNumberTaintingTest(){
    var a = taint(2);
    assertNumberTainted(Math.acosh(a));
    assertNear(1.3169578969248166, Math.acosh(a));
}

function asinNumberTaintingTest(){
    var a = taint(0.5);
    assertNumberTainted(Math.asin(a));
    assertNear(Math.PI / 6, Math.asin(a));
}

function asinhNumberTaintingTest(){
    var a = taint(-1);
    assertNumberTainted(Math.asinh(a));
    assertNear(-0.881373587019543, Math.asinh(a));
}

function atanNumberTaintingTest(){
    var a = taint(1);
    assertNumberTainted(Math.atan(a));
    assertNear(Math.PI / 4, Math.atan(a));
}

function atan2NumberTaintingTest(){
    var a = taint(10);
    var b = taint(0);
    var c = 0;
    var d = 10;
    assertNumberTainted(Math.atan2(a, b));
    assertNumberTainted(Math.atan2(a, c));
    assertNumberTainted(Math.atan2(d, b));
    assertNear(Math.PI / 2, Math.atan2(a, b));
}

function atanhNumberTaintingTest(){
    var a = taint(0.5);
    assertNumberTainted(Math.atanh(a));
    assertNear(0.5493061443340548, Math.atanh(a));
}

function cbrtNumberTaintingTest(){
    var a = taint(64);
    assertNumberTainted(Math.cbrt(a));
    assertEq(4, Math.cbrt(a));
}

function ceilNumberTaintingTest(){
    var a = taint(1.5);
    assertNumberTainted(Math.ceil(a));
    assertEq(2, Math.ceil(a));
}

function clz32NumberTaintingTest(){
    var a = taint(1000);
    assertNumberTainted(Math.clz32(a));
    assertEq(22, Math.clz32(a));
}

function cosNumberTaintingTest(){
    var a = taint(Math.PI / 3);
    assertNumberTainted(Math.cos(a));
    assertNear(0.5, Math.cos(a));
}

function coshNumberTaintingTest(){
    var a = taint(2);
    assertNumberTainted(Math.cosh(a));
    assertNear(3.7621956910836314, Math.cosh(a));
}

function expNumberTaintingTest(){
    var a = taint(1);
    assertNumberTainted(Math.exp(a));
    assertEq(Math.E, Math.exp(a));
}

function expm1NumberTaintingTest(){
    var a = taint(1);
    assertNumberTainted(Math.expm1(a));
    assertEq(Math.E - 1, Math.expm1(a));
}

function floorNumberTaintingTest(){
    var a = taint(1.5);
    assertNumberTainted(Math.floor(a));
    assertEq(1, Math.floor(a));
}

function froundNumberTaintingTest(){
    var a = taint(1.337);
    assertNumberTainted(Math.fround(a));
    assertEq(Math.fround(1.337), Math.fround(a));
}

function hypotNumberTaintingTest(){
    var a = taint(3);
    var b = taint(4);
    var c = taint(12);
    var d = taint(5);
    var e = 3;
    var f = 12;

    assertNumberTainted(Math.hypot(a, b));
    assertEq(5, Math.hypot(a, b));

    assertNumberTainted(Math.hypot(a, b, c));
    assertEq(13, Math.hypot(a, b, c));

    assertNumberTainted(Math.hypot(e, b));
    assertEq(5, Math.hypot(e, b));

    assertNumberTainted(Math.hypot(e, b, f));
    assertEq(13, Math.hypot(e, b, f));
    
    assertNumberTainted(Math.hypot(a, b, c, d));
    assertEq(13.92838827718412, Math.hypot(a, b, c, d));
}

function imulNumberTaintingTest(){
    var a = taint(2);
    var b = taint(3);

    assertNumberTainted(Math.imul(a, b));
    assertEq(6, Math.imul(a, b));

    assertNumberTainted(Math.imul(a, 0));
    assertNumberTainted(Math.imul(0, a));
    assertEq(0, Math.imul(a, 0));

    var d = taint(-2);
    var e = taint(-3);
    assertNumberTainted(Math.imul(d, e));
    assertEq(6, Math.imul(d, e));

    // Edge cases with large numbers
    var f = taint(0x7fffffff);  // Max positive 32-bit signed integer
    var g = taint(0x80000000);  // Min negative 32-bit signed integer
    assertNumberTainted(Math.imul(f, g));
    assertEq(-0x80000000, Math.imul(f, g));
}

function logNumberTaintingTest(){
    var a = taint(Math.E);
    assertNumberTainted(Math.log(a));
    assertEq(1, Math.log(a));
}

function log10NumberTaintingTest(){
    var a = taint(100);
    assertNumberTainted(Math.log10(a));
    assertEq(2, Math.log10(a));
}

function log1pNumberTaintingTest(){
    var a = taint(100);
    assertNumberTainted(Math.log1p(a));
    assertEq(4.61512051684126, Math.log1p(a));
}

function log2NumberTaintingTest(){
    var a = taint(8);
    assertNumberTainted(Math.log2(a));
    assertEq(3, Math.log2(a));
}

function maxNumberTaintingTest(){
    var a = taint(10);
    var b = taint(20);
    assertNumberTainted(Math.max(a, b));
    assertEq(20, Math.max(a, b));
}

function minNumberTaintingTest(){
    var a = taint(10);
    var b = taint(20);
    assertNumberTainted(Math.min(a, b));
    assertEq(10, Math.min(a, b));
}

function powNumberTaintingTest(){
    var a = taint(2);
    var b = taint(3);
    var c = 2;
    var d = 3;
    assertNumberTainted(Math.pow(a, b));
    assertNumberTainted(Math.pow(a, d));
    assertNumberTainted(Math.pow(c, b));
    assertEq(8, Math.pow(a, b));
}

function roundNumberTaintingTest(){
    var a = taint(1.5);
    assertNumberTainted(Math.round(a));
    assertEq(2, Math.round(a));
}

function signNumberTaintingTest(){
    var a = taint(42);
    var b = taint(-42);
    assertNumberTainted(Math.sign(a));
    assertEq(1, Math.sign(a));
    assertNumberTainted(Math.sign(b));
    assertEq(-1, Math.sign(b));
}

function sinNumberTaintingTest(){
    var a = taint(Math.PI / 2);
    assertNumberTainted(Math.sin(a));
    assertEq(1, Math.sin(a));
}

function sinhNumberTaintingTest(){
    var a = taint(2);
    assertNumberTainted(Math.sinh(a));
    assertEq(3.626860407847019, Math.sinh(a));
}

function sqrtNumberTaintingTest(){
    var a = taint(4);
    assertNumberTainted(Math.sqrt(a));
    assertEq(2, Math.sqrt(a));
}

function tanNumberTaintingTest(){
    var a = taint(Math.PI / 4);
    assertNumberTainted(Math.tan(a));
    assertNear(1, Math.tan(a));
}

function tanhNumberTaintingTest(){
    var a = taint(-1);
    assertNumberTainted(Math.tanh(a));
    assertNear(-0.7615941559557649, Math.tanh(a));
}

function truncNumberTaintingTest(){
    var a = taint(42.43);
    assertNumberTainted(Math.trunc(a));
    assertEq(42, Math.trunc(a));
}

runTaintTest(absNumberTaintingTest);
runTaintTest(acosNumberTaintingTest);
runTaintTest(acoshNumberTaintingTest);
runTaintTest(asinNumberTaintingTest);
runTaintTest(asinhNumberTaintingTest);
runTaintTest(atanNumberTaintingTest);
runTaintTest(atan2NumberTaintingTest);
runTaintTest(atanhNumberTaintingTest);
runTaintTest(cbrtNumberTaintingTest);
runTaintTest(ceilNumberTaintingTest);
runTaintTest(clz32NumberTaintingTest);
runTaintTest(cosNumberTaintingTest);
runTaintTest(coshNumberTaintingTest);
runTaintTest(expNumberTaintingTest);
runTaintTest(expm1NumberTaintingTest);
runTaintTest(floorNumberTaintingTest);
runTaintTest(froundNumberTaintingTest);
runTaintTest(hypotNumberTaintingTest);
runTaintTest(imulNumberTaintingTest);
runTaintTest(logNumberTaintingTest);
runTaintTest(log10NumberTaintingTest);
runTaintTest(log1pNumberTaintingTest);
runTaintTest(log2NumberTaintingTest);
runTaintTest(maxNumberTaintingTest);
runTaintTest(minNumberTaintingTest);
runTaintTest(powNumberTaintingTest);
runTaintTest(roundNumberTaintingTest);
runTaintTest(signNumberTaintingTest);
runTaintTest(sinNumberTaintingTest);
runTaintTest(sinhNumberTaintingTest);
runTaintTest(sqrtNumberTaintingTest);
runTaintTest(tanNumberTaintingTest);
runTaintTest(tanhNumberTaintingTest);
runTaintTest(truncNumberTaintingTest);

reportCompare(0, 0, "ok");