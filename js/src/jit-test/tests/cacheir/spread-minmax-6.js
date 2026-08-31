function testMin(arr) {
    var sum = 0;
    for (var i = 0; i < 50; i++) {
	sum += Math.min(...arr);
    }
    return sum;
}

function testMax(arr) {
    var sum = 0;
    for (var i = 0; i < 50; i++) {
	sum += Math.max(...arr);
    }
    return sum;
}

let N = 20000;
let arr = [];
for (var i = 0; i < N; i++) {
  arr.push(i+1);
}

assertEq(testMin(arr), 50 * 1);
assertEq(testMax(arr), 50 * N);
