function foo(numArgs, dummy) {
  for (var i = 0; i < 100; i++) {
    assertEq(arguments.length, numArgs);
  }
}

foo(1);
