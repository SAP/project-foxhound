// |jit-test| --ion-eager

let v0 = 64;
for (let v1 = 0; v1 < 1024; v1++) {
  v0 %= -1;
}
assertEq(v0, 0);
