function test() {
  for (let i = 0; i < 50; i++) {
    globalVar = i;
    assertEq(globalVar, i);
    if (i === 40)
      delete this.globalVar;
  }
}
test();
