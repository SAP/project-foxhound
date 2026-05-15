// |jit-test| --ion-offthread-compile=off;
//
function test(k) {

  var a = {z:0, a:0, b:1, c:2, d:3, e:4, f:5, g:6, h:7, i:8, j:9, k:10};
  if (k%2 == 0) {
    a.l = 1;
  } else {
    a.m = 1;
    a.l = 1;
  }

  return a.l;
}

// LoadDynamicSlotFromOffset
for (let i=0; i<1000; i++) {
  test(i);
}
