
oomTest(function () {
  Object.defineProperty([], 1, { function() {} });
  for (var i of "month") {};
  Object.defineProperty([], "", {});
});
