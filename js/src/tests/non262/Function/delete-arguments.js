// The use of arguments other than reading arguments.length should disable
// the ArgumentsLength optimization, and should emit the raw property
// operations.
//
// This includes:
//   * assignment on arguments.length
//   * delete on arguments.length
//   * use of arguments alone
//   * optional chain

function deleteOnArgumentsLength() {
  assertEq(arguments.length, 3);

  const result = delete arguments.length;
  assertEq(result, true);

  assertEq(arguments.length, undefined);

  const result2 = delete arguments.length;
  assertEq(result2, true);
}

deleteOnArgumentsLength(1, 2, 3);

function deleteOnArgumentsOptionalLength() {
  assertEq(arguments?.length, 3);

  const result = delete arguments?.length;
  assertEq(result, true);

  assertEq(arguments?.length, undefined);

  const result2 = delete arguments?.length;
  assertEq(result2, true);
}

deleteOnArgumentsOptionalLength(1, 2, 3);

function deleteOnArgumentsLengthAfterModify() {
  arguments.length = 4;

  assertEq(arguments.length, 4);

  const result = delete arguments.length;
  assertEq(result, true);

  assertEq(arguments.length, undefined);

  const result2 = delete arguments.length;
  assertEq(result2, true);
}

deleteOnArgumentsLengthAfterModify();

function modify(a) {
  a.length = 4;
}

function deleteOnArgumentsLengthAfterImplicitModify() {
  modify(arguments);

  assertEq(arguments.length, 4);

  const result = delete arguments.length;
  assertEq(result, true);

  assertEq(arguments.length, undefined);

  const result2 = delete arguments.length;
  assertEq(result2, true);
}

deleteOnArgumentsLengthAfterImplicitModify();

function deleteOnArgumentsLengthProp() {
  arguments.length = {
    prop: 10,
  };

  assertEq(arguments.length.prop, 10);

  const result = delete arguments.length.prop;
  assertEq(result, true);

  assertEq(arguments.length.prop, undefined);

  const result2 = delete arguments.length.prop;
  assertEq(result2, true);
}

deleteOnArgumentsLengthProp();

function deleteOnArgumentsLengthOptionalProp() {
  arguments.length = {
    prop: 10,
  };

  assertEq(arguments.length?.prop, 10);

  const result = delete arguments.length?.prop;
  assertEq(result, true);

  assertEq(arguments.length?.prop, undefined);

  // The no-op delete should also return true.
  const result2 = delete arguments.length?.prop;
  assertEq(result2, true);
}

deleteOnArgumentsLengthOptionalProp();

function deleteOnArgumentsOptionalLengthOptionalProp() {
  arguments.length = {
    prop: 10,
  };

  assertEq(arguments?.length?.prop, 10);

  const result = delete arguments?.length?.prop;
  assertEq(result, true);

  assertEq(arguments?.length?.prop, undefined);

  const result2 = delete arguments?.length?.prop;
  assertEq(result2, true);

  const result3 = delete arguments?.length;
  assertEq(result3, true);

  assertEq(arguments.length, undefined);

  const result4 = delete arguments?.length?.prop;
  assertEq(result4, true);
}

deleteOnArgumentsOptionalLengthOptionalProp();

if (typeof reportCompare === "function")
  reportCompare(0, 0);
