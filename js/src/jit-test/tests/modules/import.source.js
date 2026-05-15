// |jit-test| skip-if: !getBuildConfiguration("source-phase-imports"); --enable-source-phase-imports

load(libdir + "asserts.js");

let caught = false;
import.source("module.js").then(
  () => {
    throw new Error("import.source should have been rejected");
  },
  (error) => {
    assertEq(error.message, "source phase imports are not yet implemented");
    caught = true;
  }
);

drainJobQueue();
assertEq(caught, true);
