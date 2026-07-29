load(libdir + "asserts.js");

registerModule('b', parseModule(`export const x = 1;`));
registerModule('d', parseModule(`export const x = 2;`));
registerModule('a', parseModule(`export * from 'c';`));
registerModule('c', parseModule(`export * from 'a'; export * from 'b'; export * from 'd';`));
registerModule('entry', parseModule(`import { x } from 'c'; x;`));

let caught = false;
import("entry").then(
  () => {
    assertEq(false, true, "expected import to fail");
  },
  e => {
    caught = true;
    assertEq(e instanceof SyntaxError, true);
    assertEq(String(e.message).includes("circular"), false);
    assertEq(String(e.message).includes("ambiguous"), true);
  }
);

drainJobQueue();
assertEq(caught, true);
