// This test case make use of RemoveTruncateOnOutput.
function myrandom() {
  this.seed = ((this.seed ^ 0xc761c23c) ^ (this.seed >>> 19)) & 0xffffffff;
  this.seed = ((this.seed + 0x165667b1) + (this.seed << 5))   & 0xffffffff;
};
var MyMath = { random: myrandom, seed: 0 };
var kSplayTreeSize = 8000;
for (var i = 0; i < kSplayTreeSize; i++) MyMath.random();
