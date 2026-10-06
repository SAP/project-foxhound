gczeal(0);
gcparam('maxNurseryBytes', 262144);
gc();

setJitCompilerOption("baseline.warmup.trigger", 9);
setJitCompilerOption("ion.warmup.trigger", 20);

function fill(arr, count) {
  for (let i = 0; i < count; i++) {
    arr[i] = {a: i, b: i, c: i, d: i, e: i, f: i};
  }
}

let warmTA = new Int32Array(1);

function alwaysTrue(i) { return true; }
let uceFault = function(i) {
  if (i > 98) uceFault = alwaysTrue;
  return false;
};

function recoverSubarray(i, ta) {
  let view = ta.subarray(1);
  if (uceFault(i)) view.length;
}

for (let j = 0; j < 21; j++) {
  recoverSubarray(j, warmTA);
}

let filler = new Array(3000);
minorgc();

let targetTA = new Int32Array(new ArrayBuffer(8));
let keep = [];
keep.push(new Uint8Array(targetTA.buffer));
minorgc();
keep.push(new Uint8Array(targetTA.buffer));

fill(filler, 1634);
recoverSubarray(99, targetTA);
minorgc();
