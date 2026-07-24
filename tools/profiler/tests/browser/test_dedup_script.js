// Script for testing source deduplication
const start = performance.now();
let result = 0;
while (performance.now() - start < 10) {
  for (let i = 0; i < 100; i++) {
    result += Math.random() * i;
  }
}
