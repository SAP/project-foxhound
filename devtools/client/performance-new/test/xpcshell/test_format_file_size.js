/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { require } = ChromeUtils.importESModule(
  "resource://devtools/shared/loader/Loader.sys.mjs"
);
const {
  formatFileSize,
} = require("resource://devtools/client/performance-new/shared/utils.js");

add_task(function test_basic_units() {
  info(
    "formatFileSize() returns a {size, unitL10nId} object for a given byte count. " +
      "This test checks byte-level values."
  );

  deepEqual(
    formatFileSize(0),
    { size: 0, unitL10nId: "perftools-memory-unit-b" },
    "0 bytes"
  );
  deepEqual(
    formatFileSize(1),
    { size: 1, unitL10nId: "perftools-memory-unit-b" },
    "1 byte"
  );
  deepEqual(
    formatFileSize(100),
    { size: 100, unitL10nId: "perftools-memory-unit-b" },
    "100 bytes"
  );
  deepEqual(
    formatFileSize(1023),
    { size: 1020, unitL10nId: "perftools-memory-unit-b" },
    "1023 bytes rounds to 1020 via toPrecision(3)"
  );
});

add_task(function test_kib() {
  info("Check KiB-range values.");

  deepEqual(
    formatFileSize(1024),
    { size: 1, unitL10nId: "perftools-memory-unit-kib" },
    "1 KiB"
  );
  deepEqual(
    formatFileSize(1536),
    { size: 1.5, unitL10nId: "perftools-memory-unit-kib" },
    "1.5 KiB"
  );
  deepEqual(
    formatFileSize(10240),
    { size: 10, unitL10nId: "perftools-memory-unit-kib" },
    "10 KiB"
  );
});

add_task(function test_mib() {
  info("Check MiB-range values.");

  deepEqual(
    formatFileSize(1048576),
    { size: 1, unitL10nId: "perftools-memory-unit-mib" },
    "1 MiB"
  );
  deepEqual(
    formatFileSize(8388608),
    { size: 8, unitL10nId: "perftools-memory-unit-mib" },
    "8 MiB"
  );
});

add_task(function test_gib() {
  info("Check GiB-range values.");

  deepEqual(
    formatFileSize(1073741824),
    { size: 1, unitL10nId: "perftools-memory-unit-gib" },
    "1 GiB"
  );
});

add_task(function test_profile_entry_sizes() {
  info(
    "Check realistic buffer sizes using PROFILE_ENTRY_SIZE = 8, as used " +
      "by _entriesTextDisplay in about:profiling."
  );

  const PROFILE_ENTRY_SIZE = 8;

  // 128k entries = 1 MiB
  deepEqual(
    formatFileSize(131072 * PROFILE_ENTRY_SIZE),
    { size: 1, unitL10nId: "perftools-memory-unit-mib" },
    "128k entries = 1 MiB"
  );

  // 10M entries = 80000000 bytes = ~76.3 MiB
  deepEqual(
    formatFileSize(10000000 * PROFILE_ENTRY_SIZE),
    { size: 76.3, unitL10nId: "perftools-memory-unit-mib" },
    "10M entries"
  );
});

add_task(function test_invalid_input() {
  info("Check that invalid input throws.");

  Assert.throws(
    () => formatFileSize(Infinity),
    /Expected a finite number/,
    "Infinity throws"
  );
  Assert.throws(
    () => formatFileSize(NaN),
    /Expected a finite number/,
    "NaN throws"
  );
});
