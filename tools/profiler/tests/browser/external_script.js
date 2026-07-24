// This is an external function
function externalFunction() {
  // Do some work for ~2ms to generate samples
  const start = performance.now();
  let result = 0;
  while (performance.now() - start < 10) {
    for (let i = 0; i < 1000; i++) {
      result += Math.random() * i;
    }
  }
  return result;
}

function calculateSum(a, b) {
  return a + b;
}
