/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from ../../../../extensions/newtab/test/xpcshell/head.js */

const { AboutNewTabResourceMapping } = ChromeUtils.importESModule(
  "resource:///modules/AboutNewTabResourceMapping.sys.mjs"
);

const { FileUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/FileUtils.sys.mjs"
);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

add_task(function test_isXPIInCurrentProfile_xpi_inside_profile() {
  const xpiFile = FileUtils.getDir("ProfD", ["extensions"]).clone();
  xpiFile.append("newtab@mozilla.org.xpi");
  const rootURI = Services.io.newURI(
    `jar:${Services.io.newFileURI(xpiFile).spec}!/`
  );
  Assert.ok(
    AboutNewTabResourceMapping.isXPIInCurrentProfile(rootURI),
    "XPI inside profile should return true"
  );
});

add_task(function test_isXPIInCurrentProfile_xpi_outside_profile() {
  const rootURI = Services.io.newURI(
    "jar:file:///some/outside/path/extensions/newtab@mozilla.org.xpi!/"
  );
  Assert.ok(
    !AboutNewTabResourceMapping.isXPIInCurrentProfile(rootURI),
    "XPI outside profile should return false"
  );
});

// This test is covering the edge case where the jar file is derived
// from a path coming from an OS with different paths conventions
// to make sure it is handled gracefully (e.g. Windows like paths when
// running on Linux/macOS and *nix like paths when running on Windows).
add_task(function test_isXPIInCurrentProfile_other_OS_path_in_uri() {
  const rootURI = Services.io.newURI(
    AppConstants.MOZ_WIDGET_TOOLKIT == "windows"
      ? "jar:file:///unix/path/to/addon/newtab@mozilla.org.xpi!/"
      : "jar:file:///C:/window/path/to/addon/newtab@mozilla.org.xpi!/"
  );
  Assert.ok(
    !AboutNewTabResourceMapping.isXPIInCurrentProfile(rootURI),
    "JAR URI coming from other OS with incompatible path convertions should return false"
  );
});

// This test is covering the edge case where deriving the XPI file path
// from the rootURI throws, to make sure it is also handled gracefully
// (this is mainly a smoke test, this kind of rootURI is only expected
// from termporarily installed addons loaded as unpacked from a directory
// and the isXPIInCurrentProfile isn't called when the path in the rootURI
// spec does not end with .xpi, and so it should not be really hit in practice)
add_task(function test_isXPIInCurrentProfile_non_jar_uri() {
  const rootURI = Services.io.newURI("file:///some/path/newtab");
  Assert.ok(
    !AboutNewTabResourceMapping.isXPIInCurrentProfile(rootURI),
    "Non-JAR URI should return false"
  );
});

add_task(async function test_getPreferredMapping_fallback_to_builtin() {
  const resProto = Cc[
    "@mozilla.org/network/protocol;1?name=resource"
  ].getService(Ci.nsIResProtocolHandler);

  const builtinRootURISpec = `${resProto.getSubstitution("builtin-addons").spec}newtab/`;

  // Retrieve the built-in version from the manifest.json.
  const builtinManifestData = await fetch(
    `${builtinRootURISpec}manifest.json`
  ).then(r => r.json());

  const expected = {
    isXPI: false,
    rootURI: builtinRootURISpec,
    version: builtinManifestData.version,
  };

  const sandbox = sinon.createSandbox();
  sandbox.stub(AboutNewTabResourceMapping, "getActiveAddonInfo").returns({
    version: "9999.0",
    rootURI: Services.io.newURI(
      "jar:file:///some/outside/path/extensions/newtab@mozilla.org.xpi!/"
    ),
    isPrivileged: true,
  });

  const actual = AboutNewTabResourceMapping.getPreferredMapping();

  Assert.ok(
    AboutNewTabResourceMapping.getActiveAddonInfo.calledOnce,
    "Expect getActiveAddonInfo to have been called once"
  );
  Assert.deepEqual(
    { ...actual, rootURI: actual.rootURI.spec },
    expected,
    "Expect getPreferredMapping to fallback to built-in newtab resources"
  );

  sandbox.restore();
});
