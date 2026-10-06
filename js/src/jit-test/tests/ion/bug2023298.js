var frozen = Object.freeze([0,0,0]);
function writeToFrozen(obj) {
    for (var k in obj) {
        obj[k] = 99;
    }
}
for (var i = 0; i < 2000; i++) {
    writeToFrozen(frozen);
}
for (var i = 0; i < frozen.length; i++) {
  assertEq(frozen[i], 0);
}
