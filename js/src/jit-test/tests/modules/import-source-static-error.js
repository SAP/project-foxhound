// |jit-test| module; error: SyntaxError; skip-if: !getBuildConfiguration("source-phase-imports"); --enable-source-phase-imports

// https://tc39.es/proposal-source-phase-imports/#sec-source-text-module-record-initialize-environment
// Step 7.d.iv.   Else if resolution.[[BindingName]] is source, then
// Step 7.d.iv.1. Let moduleSourceObject be resolution.[[Module]].[[ModuleSource]].
// Step 7.d.iv.2. If moduleSourceObject is empty, throw a SyntaxError exception.
// (JavaScript modules do not currently support import source)
import source mod from "empty.js";
