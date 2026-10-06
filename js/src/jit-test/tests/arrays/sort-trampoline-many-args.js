// |jit-test| skip-if: helperThreadCount() === 0
let src = `
  var arr = [3, 1, 2];
  var big = new Array(470000);
  big[0] = (a, b) => a - b;
  for (var i = 1; i < big.length; i++) {
    big[i] = i;
  }
  try {
    arr.sort(...big);
  } catch {}
`;
evalInWorker(src);
evalInWorker(src);
evaluate(src);
