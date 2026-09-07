// |reftest| shell-option(--enable-intl-locale-info) skip-if(!this.hasOwnProperty('Intl')||!this.Intl.Locale.prototype.hasOwnProperty('firstDayOfWeek')||!xulRuntime.shell) -- Intl.Locale-info is not enabled unconditionally, requires shell-options
// Copyright 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-intl.locale.prototype.getTextInfo
description: >
    Checks that the return value of Intl.Locale.prototype.getTextInfo is an Object.
info: |
  get Intl.Locale.prototype.getTextInfo
  ...
  5. Let info be ! ObjectCreate(%Object.prototype%).
features: [Intl.Locale,Intl.Locale-info]
---*/

assert.sameValue(Object.getPrototypeOf(new Intl.Locale('en').getTextInfo()), Object.prototype);

reportCompare(0, 0);
