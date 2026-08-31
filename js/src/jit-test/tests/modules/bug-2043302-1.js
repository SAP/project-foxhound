load(libdir + "asserts.js");

registerModule('b', parseModule(`export const x = 1;`));
registerModule('d', parseModule(`export const x = 2;`));
registerModule('a', parseModule(`export * from 'b';\nexport * from 'd';`));
// c's star export of 'a' is at line 3 (two blank lines above)
registerModule('c', parseModule(`\n\nexport * from 'a';`));
// entry's import is at line 1
registerModule('entry', parseModule(`import { x } from 'c';`));

let caught = false;
import("entry").then(
  () => {
    assertEq(false, true, "expected import to fail");
  },
  e => {
    caught = true;
    assertEq(e instanceof SyntaxError, true);
    assertEq(String(e.message).includes("ambiguous"), true);
    // Error must point to the import in 'entry' (line 1),
    // not to the star export in 'c' (line 3).
    assertEq(e.lineNumber, 1);
  }
);

drainJobQueue();
assertEq(caught, true);
