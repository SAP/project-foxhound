// |jit-test| --ion-eager

const arr = new Int32Array(4096);
let count = 0;
for (let i = 0; i < 2; i++) {
    i--;
    this.Atomics.compareExchange(arr, 1, i, i);
    count++;
    if (count > 1024) {
        break;
    }
}
assertEq(count, 1025);
