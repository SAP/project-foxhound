// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) error:SyntaxError -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2023 Ron Buckton. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-class-definitions-static-semantics-early-errors
description: BindingIdentifier may not be `await` within class static blocks
info: |
  BindingIdentifier : Identifier

  [...]
  - It is a Syntax Error if the code matched by this production is nested,
    directly or indirectly (but not crossing function or static initialization
    block boundaries), within a ClassStaticBlock and the StringValue of
    Identifier is "await".
negative:
  phase: parse
  type: SyntaxError
features: [class-static-block, explicit-resource-management]
---*/

$DONOTEVALUATE();

class C {
  static {
    using await = null;
  }
}
