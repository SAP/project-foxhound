oomTest(function() {
  for (var i = 0; i < 5; ++i) {
    new Int8Array(2).subarray(0).length;
  }
});
