function no_conflict() {
  return arguments.length;
}
assertEq(no_conflict(1, 2, 3), 3);

function conflict_func() {
  function arguments(a) {}
  return arguments.length;
}
assertEq(conflict_func(1, 2, 3), 1);

function conflict_gen() {
  function* arguments(a) {}
  return arguments.length;
}
assertEq(conflict_gen(1, 2, 3), 1);

function conflict_async() {
  async function arguments(a) {}
  return arguments.length;
}
assertEq(conflict_async(1, 2, 3), 1);

function conflict_async_gen() {
  async function* arguments(a) {}
  return arguments.length;
}
assertEq(conflict_async_gen(1, 2, 3), 1);

function conflict_var() {
  var arguments = [0];
  return arguments.length;
}
assertEq(conflict_var(1, 2, 3), 1);

function conflict_let() {
  let arguments = [0];
  return arguments.length;
}
assertEq(conflict_let(1, 2, 3), 1);

function conflict_const() {
  const arguments = [0];
  return arguments.length;
}
assertEq(conflict_const(1, 2, 3), 1);

function conflict_block_func() {
  {
    function arguments(a) {}
  }
  return arguments.length;
}
assertEq(conflict_block_func(1, 2, 3), 1);

function conflict_block_func_and_let() {
  {
    function arguments(a) {}
  }
  let arguments = [0, 0];
  return arguments.length;
}
assertEq(conflict_block_func_and_let(1, 2, 3), 2);
