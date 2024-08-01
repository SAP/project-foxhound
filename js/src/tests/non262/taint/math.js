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
    assertNear(Math.PI / 3, Math.acos(0.5));
}

function asinNumberTaintingTest(){
    var a = taint(0.5);
    assertNumberTainted(Math.asin(a));
    assertNear(Math.PI / 6, Math.asin(a));
}

function atanNumberTaintingTest(){
    var a = taint(1);
    assertNumberTainted(Math.atan(a));
    assertNear(Math.PI / 4, Math.atan(a));
}

function atan2NumberTaintingTest(){
    var a = taint(1);
    var b = taint(1);
    assertNumberTainted(Math.atan2(a, b));
    assertNear(Math.PI / 4, Math.atan2(a, b));
}

function ceilNumberTaintingTest(){
    var a = taint(1.5);
    assertNumberTainted(Math.ceil(a));
    assertEq(2, Math.ceil(a));
}

function cosNumberTaintingTest(){
    var a = taint(Math.PI / 3);
    assertNumberTainted(Math.cos(a));
    assertNear(0.5, Math.cos(a));
}

function expNumberTaintingTest(){
    var a = taint(1);
    assertNumberTainted(Math.exp(a));
    assertEq(Math.E, Math.exp(a));
}

function floorNumberTaintingTest(){
    var a = taint(1.5);
    assertNumberTainted(Math.floor(a));
    assertEq(1, Math.floor(a));
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
    assertNumberTainted(Math.pow(a, b));
    assertEq(8, Math.pow(a, b));
}

function roundNumberTaintingTest(){
    var a = taint(1.5);
    assertNumberTainted(Math.round(a));
    assertEq(2, Math.round(a));
}

function sinNumberTaintingTest(){
    var a = taint(Math.PI / 2);
    assertNumberTainted(Math.sin(a));
    assertEq(1, Math.sin(a));
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

runTaintTest(absNumberTaintingTest);
runTaintTest(acosNumberTaintingTest);
runTaintTest(asinNumberTaintingTest);
runTaintTest(atanNumberTaintingTest);
runTaintTest(atan2NumberTaintingTest);
runTaintTest(ceilNumberTaintingTest);
runTaintTest(cosNumberTaintingTest);
runTaintTest(expNumberTaintingTest);
runTaintTest(floorNumberTaintingTest);
runTaintTest(logNumberTaintingTest);
runTaintTest(log10NumberTaintingTest);
runTaintTest(maxNumberTaintingTest);
runTaintTest(minNumberTaintingTest);
runTaintTest(powNumberTaintingTest);
runTaintTest(roundNumberTaintingTest);
runTaintTest(sinNumberTaintingTest);
runTaintTest(sqrtNumberTaintingTest);
runTaintTest(tanNumberTaintingTest);

reportCompare(0, 0, "ok");