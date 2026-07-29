// |reftest| shell-option(--enable-source-phase-imports) shell-option(--enable-source-phase-imports-test262-module-source) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('source-phase-imports'))||!(this.hasOwnProperty('wasmIsSupported')&&wasmIsSupported())||!xulRuntime.shell) error:SyntaxError -- source-phase-imports,source-phase-imports-module-source is not enabled unconditionally, requires shell-options
// This file was procedurally generated from the following sources:
// - src/dynamic-import/import-source-no-new-call-expression-prop-access.case
// - src/dynamic-import/syntax/invalid/top-level.template
/*---
description: ImportCall is a CallExpression, it can't be preceded by the new keyword (property access) (top level syntax)
esid: sec-import-call-runtime-semantics-evaluation
features: [source-phase-imports, source-phase-imports-module-source, dynamic-import]
flags: [generated]
negative:
  phase: parse
  type: SyntaxError
info: |
    ImportCall :
        import( AssignmentExpression )


    CallExpression:
      ImportCall
      CallExpression . IdentifierName

    ImportCall :
        import . source ( AssignmentExpression[+In, ?Yield, ?Await] )

    NewExpression :
      MemberExpression
      new NewExpression

---*/

$DONOTEVALUATE();

new import.source('<module source>').prop;
