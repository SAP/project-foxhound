/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function run_test() {
  var libs = Services.profiler.sharedLibraries;

  Assert.equal(typeof libs, "object");
  Assert.ok(Array.isArray(libs));
  Assert.equal(typeof libs, "object");
  Assert.greaterOrEqual(libs.length, 1);
  Assert.equal(typeof libs[0], "object");
  Assert.equal(typeof libs[0].name, "string");
  Assert.equal(typeof libs[0].path, "string");
  Assert.equal(typeof libs[0].debugName, "string");
  Assert.equal(typeof libs[0].debugPath, "string");
  Assert.equal(typeof libs[0].arch, "string");
  Assert.equal(typeof libs[0].start, "number");
  Assert.equal(typeof libs[0].end, "number");
  Assert.lessOrEqual(libs[0].start, libs[0].end);

  // Check libxul and make sure that it has valid breakpadId and codeId strings.
  // The name of libxull will be different on each platform:
  // - Linux: libxul.so
  // - macOS: XUL
  // - Windows: xul.dll
  const libxul = libs.find(lib => lib.name.toLowerCase().includes("xul"));
  Assert.equal(typeof libxul, "object");
  Assert.ok(typeof libxul.breakpadId === "string" && libxul.breakpadId !== "");
  Assert.ok(typeof libxul.codeId === "string" && libxul.codeId !== "");
}
