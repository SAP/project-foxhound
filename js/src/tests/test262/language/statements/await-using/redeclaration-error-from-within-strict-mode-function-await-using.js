// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) error:SyntaxError -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2023 Ron Buckton. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-declarative-environment-records-initializebinding-n-v
description: >
    Redeclaration error within strict mode function inside non-strict code.
negative:
  phase: parse
  type: SyntaxError
flags: [noStrict]
features: [explicit-resource-management]
---*/

$DONOTEVALUATE();
(async function() { 'use strict'; { await using f = null; var f; } })
