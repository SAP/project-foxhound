// |jit-test| --emit-interpreter-entry

function target(a) {
    assertJitStackInvariants();
    return a;
}
function caller() {
    return target(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
}
for (var i = 0; i < 50; i++) caller();
