// |jit-test| skip-if: !getBuildConfiguration("source-phase-imports") || !wasmIsSupported() || getBuildConfiguration("release_or_beta"); --enable-source-phase-imports; --enable-wasm-esm-integration; --enable-source-phase-imports-test262-module-source

load(libdir + "asserts.js");

let result;
import.source("<module source>").then(
  (moduleSource) => {
    result = moduleSource;
  },
  (error) => {
    throw new Error("import.source should not have been rejected: " + error);
  }
);

drainJobQueue();

const AbstractModuleSource = getAbstractModuleSource();

assertEq(result instanceof AbstractModuleSource, true);

// Calling the AbstractModuleSource constructor should throw a TypeError.
assertThrowsInstanceOf(() => new AbstractModuleSource(), TypeError);
assertThrowsInstanceOf(() => AbstractModuleSource(), TypeError);

const toStringTag = Object.getOwnPropertyDescriptor(AbstractModuleSource.prototype, Symbol.toStringTag).get;
assertEq(toStringTag.call(result), "WebAssembly.Module");
assertEq(toStringTag.call({}), undefined);
assertEq(toStringTag.call(42), undefined);

// import.source on a JavaScript module should reject with a SyntaxError.
let error;
import.source("empty.js").then(
  () => {
    throw new Error("import.source should have been rejected");
  },
  (e) => {
    error = e;
  }
);

drainJobQueue();

assertEq(error instanceof SyntaxError, true);
