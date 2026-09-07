// |reftest| shell-option(--enable-source-phase-imports) shell-option(--enable-source-phase-imports-test262-module-source) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('source-phase-imports'))||!(this.hasOwnProperty('wasmIsSupported')&&wasmIsSupported())||!xulRuntime.shell) -- source-phase-imports,source-phase-imports-module-source is not enabled unconditionally, requires shell-options
// This file was procedurally generated from the following sources:
// - src/dynamic-import/import-source-empty-str-is-valid-assign-expr.case
// - src/dynamic-import/syntax/valid/top-level.template
/*---
description: Calling import.source('') (top level syntax)
esid: sec-import-call-runtime-semantics-evaluation
features: [source-phase-imports, source-phase-imports-module-source, dynamic-import]
flags: [generated]
info: |
    ImportCall :
        import( AssignmentExpression )

---*/

import.source('<module source>');

reportCompare(0, 0);
