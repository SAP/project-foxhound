// Test module fields related to asynchronous evaluation.

const UNSET = -1;
const DONE = -2;

{
  let m = parseModule('');
  assertEq(m.status, "New");

  moduleLink(m);
  assertEq(m.asyncEvaluationOrder, UNSET);
  assertEq(m.status, "Linked");

  moduleEvaluate(m);
  assertEq(m.asyncEvaluationOrder, UNSET);
  assertEq(m.status, "Evaluated");
}

{
  let m = parseModule('await 1;');

  moduleLink(m);
  assertEq(m.asyncEvaluationOrder, UNSET);

  moduleEvaluate(m);
  assertEq(m.status, "EvaluatingAsync");
  assertEq(m.asyncEvaluationOrder, 0);

  drainJobQueue();
  assertEq(m.status, "Evaluated");
  assertEq(m.asyncEvaluationOrder, DONE);
}

{
  let m = parseModule('await 1; throw 2;');

  moduleLink(m);
  moduleEvaluate(m).catch(() => 0);
  assertEq(m.status, "EvaluatingAsync");
  assertEq(m.asyncEvaluationOrder, 0);

  drainJobQueue();
  assertEq(m.status, "Evaluated");
  assertEq(m.evaluationError, 2);
  assertEq(m.asyncEvaluationOrder, DONE);
}

{
  let m = parseModule('throw 1; await 2;');
  moduleLink(m);
  moduleEvaluate(m).catch(() => 0);
  assertEq(m.status, "EvaluatingAsync");
  assertEq(m.asyncEvaluationOrder, 0);

  drainJobQueue();
  assertEq(m.status, "Evaluated");
  assertEq(m.evaluationError, 1);
  assertEq(m.asyncEvaluationOrder, DONE);
}

{
  clearModules();
  let a = registerModule('a', parseModule(''));
  let b = registerModule('b', parseModule('import {} from "a"; await 1;'));

  moduleLink(b);
  moduleEvaluate(b);
  assertEq(a.status, "Evaluated");
  assertEq(a.asyncEvaluationOrder, UNSET);
  assertEq(b.status, "EvaluatingAsync");
  assertEq(b.asyncEvaluationOrder, 0);

  drainJobQueue();
  assertEq(a.status, "Evaluated");
  assertEq(a.asyncEvaluationOrder, UNSET);
  assertEq(b.status, "Evaluated");
  assertEq(b.asyncEvaluationOrder, DONE);
}

{
  clearModules();
  let a = registerModule('a', parseModule('await 1;'));
  let b = registerModule('b', parseModule('import {} from "a";'));

  moduleLink(b);
  moduleEvaluate(b);
  assertEq(a.status, "EvaluatingAsync");
  assertEq(a.asyncEvaluationOrder, 0);
  assertEq(b.status, "EvaluatingAsync");
  assertEq(b.asyncEvaluationOrder, 1);

  drainJobQueue();
  assertEq(a.status, "Evaluated");
  assertEq(a.asyncEvaluationOrder, DONE);
  assertEq(b.status, "Evaluated");
  assertEq(b.asyncEvaluationOrder, DONE);
}

{
  clearModules();
  let resolve;
  var promise = new Promise(r => { resolve = r; });
  let a = registerModule('a', parseModule('await promise;'));
  let b = registerModule('b', parseModule('await 2;'));
  let c = registerModule('c', parseModule('import {} from "a"; import {} from "b";'));

  moduleLink(c);
  moduleEvaluate(c);
  assertEq(a.status, "EvaluatingAsync");
  assertEq(a.asyncEvaluationOrder, 0);
  assertEq(b.status, "EvaluatingAsync");
  assertEq(b.asyncEvaluationOrder, 1);
  assertEq(c.status, "EvaluatingAsync");
  assertEq(c.asyncEvaluationOrder, 2);

  resolve(1);
  drainJobQueue();
  assertEq(a.status, "Evaluated");
  assertEq(a.asyncEvaluationOrder, DONE);
  assertEq(b.status, "Evaluated");
  assertEq(b.asyncEvaluationOrder, DONE);
  assertEq(c.status, "Evaluated");
  assertEq(c.asyncEvaluationOrder, DONE);
}

{
  clearModules();
  let a = registerModule('a', parseModule('throw 1;'));
  let b = registerModule('b', parseModule('import {} from "a"; await 2;'));

  moduleLink(b);
  moduleEvaluate(b).catch(() => 0);
  assertEq(a.status, "Evaluated");
  assertEq(a.asyncEvaluationOrder, UNSET);
  assertEq(a.evaluationError, 1);
  assertEq(b.status, "Evaluated");
  assertEq(b.asyncEvaluationOrder, UNSET);
  assertEq(b.evaluationError, 1);
}

{
  clearModules();
  let a = registerModule('a', parseModule('throw 1; await 2;'));
  let b = registerModule('b', parseModule('import {} from "a";'));

  moduleLink(b);
  moduleEvaluate(b).catch(() => 0);
  assertEq(a.asyncEvaluationOrder, 0);
  assertEq(a.status, "EvaluatingAsync");
  assertEq(b.asyncEvaluationOrder, 1);
  assertEq(b.status, "EvaluatingAsync");

  drainJobQueue();
  assertEq(a.status, "Evaluated");
  assertEq(a.evaluationError, 1);
  assertEq(a.asyncEvaluationOrder, DONE);
  assertEq(b.status, "Evaluated");
  assertEq(b.evaluationError, 1);
  assertEq(b.asyncEvaluationOrder, DONE);
}

{
  clearModules();
  let a = registerModule('a', parseModule('await 1; throw 2;'));
  let b = registerModule('b', parseModule('import {} from "a";'));

  moduleLink(b);
  moduleEvaluate(b).catch(() => 0);
  assertEq(a.status, "EvaluatingAsync");
  assertEq(a.asyncEvaluationOrder, 0);
  assertEq(b.status, "EvaluatingAsync");
  assertEq(b.asyncEvaluationOrder, 1);

  drainJobQueue();
  assertEq(a.status, "Evaluated");
  assertEq(a.evaluationError, 2);
  assertEq(a.asyncEvaluationOrder, DONE);
  assertEq(b.status, "Evaluated");
  assertEq(b.evaluationError, 2);
  assertEq(b.asyncEvaluationOrder, DONE);
}
