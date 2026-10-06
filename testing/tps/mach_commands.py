# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import json
import os
import re
import sys
import time

from mach.decorators import Command, CommandArgument
from mozpack.copier import Jarrer
from mozpack.files import FileFinder

PHASE_TIMEOUT_SECONDS = 300
TPS_ENV = {
    "MOZ_CRASHREPORTER_DISABLE": "1",
    "GNOME_DISABLE_CRASH_DIALOG": "1",
    "XRE_NO_WINDOWS_CRASH_DIALOG": "1",
    "XPCOM_DEBUG_BREAK": "warn",
}
TPS_PREFERENCES = {
    "app.update.checkInstallTime": False,
    "app.update.disabledForTesting": True,
    "security.turn_off_all_security_so_that_viruses_can_take_over_this_computer": True,
    "browser.dom.window.dump.enabled": True,
    "devtools.console.stdout.chrome": True,
    "browser.sessionstore.resume_from_crash": False,
    "browser.shell.checkDefaultBrowser": False,
    "browser.tabs.warnOnClose": False,
    "browser.warnOnQuit": False,
    "extensions.autoDisableScopes": 10,
    "extensions.getAddons.get.url": "http://127.0.0.1:4567/addons/api/%IDS%.json",
    "extensions.getAddons.cache.enabled": False,
    "extensions.install.requireSecureOrigin": False,
    "extensions.update.enabled": False,
    "extensions.update.notifyUser": False,
    "services.sync.firstSync": "notReady",
    "services.sync.lastversion": "1.0",
    "toolkit.startup.max_resumed_crashes": -1,
    "xpinstall.signatures.required": False,
    "services.sync.testing.tps": True,
    "services.sync.engine.tabs.filteredSchemes": "about|resource|chrome|file|blob|moz-extension",
    "engine.bookmarks.repair.enabled": False,
    "extensions.experiments.enabled": True,
    "webextensions.storage.sync.kinto": False,
}
TPS_DEBUG_PREFERENCES = {
    "services.sync.log.appender.console": "Trace",
    "services.sync.log.appender.dump": "Trace",
    "services.sync.log.appender.file.level": "Trace",
    "services.sync.log.appender.file.logOnSuccess": True,
    "services.sync.log.logger": "Trace",
    "services.sync.log.logger.engine": "Trace",
}


def _build_tps_xpi(command_context, dest=None):
    """Internal helper to build TPS XPI and return the path."""
    src = os.path.join(
        command_context.topsrcdir, "services", "sync", "tps", "extensions", "tps"
    )
    dest = os.path.join(
        dest or os.path.join(command_context.topobjdir, "services", "sync"),
        "tps.xpi",
    )

    if not os.path.exists(os.path.dirname(dest)):
        os.makedirs(os.path.dirname(dest))

    if os.path.isfile(dest):
        os.unlink(dest)

    jarrer = Jarrer()
    for p, f in FileFinder(src).find("*"):
        jarrer.add(p, f)
    jarrer.copy(dest)

    return dest


@Command("tps-build", category="testing", description="Build TPS add-on.")
@CommandArgument("--dest", default=None, help="Where to write add-on.")
def build(command_context, dest):
    dest_path = _build_tps_xpi(command_context, dest)
    print(f"Built TPS add-on as {dest_path}")
    return 0


def _resolve_test_target(topsrcdir, testfile):
    if testfile:
        return os.path.abspath(os.path.join(topsrcdir, testfile))
    return os.path.join(topsrcdir, "services", "sync", "tests", "tps", "all_tests.json")


def _load_test_list(test_target):
    if not os.path.exists(test_target):
        raise FileNotFoundError(f"Test file not found: {test_target}")

    if test_target.endswith(".json"):
        with open(test_target) as f:
            test_config = json.load(f)
        tests = test_config.get("tests")
        if not isinstance(tests, dict):
            raise ValueError(
                f"Invalid TPS test config (missing tests object): {test_target}"
            )
        test_dir = os.path.dirname(test_target)
        test_files = []
        for filename, meta in tests.items():
            test_meta = meta or {}
            if test_meta.get("disabled"):
                print(f"Skipping test {filename} - {test_meta['disabled']}")
                continue
            test_path = os.path.join(test_dir, filename)
            if not os.path.exists(test_path):
                raise FileNotFoundError(f"Test file not found: {test_path}")
            test_files.append(test_path)
        return test_files

    return [test_target]


def _load_test_phases(testfile):
    import yaml

    with open(testfile) as f:
        testcontent = f.read()

    phases_match = re.search(r"\b(?:var|let|const)\s+phases\s*=\s*\{", testcontent)
    if not phases_match:
        raise ValueError(f"Could not find 'var phases' definition in {testfile}")
    phases_start = phases_match.end() - 1
    phases_end = testcontent.find("};", phases_start)
    if phases_end == -1:
        raise ValueError(f"Could not parse phases block in {testfile}")
    phases_str = testcontent[phases_start : phases_end + 1]
    return yaml.safe_load(phases_str)


def _extract_phase_status(logfile, testname, phase_name):
    found_test = False

    if os.path.exists(logfile):
        with open(logfile) as f:
            for line in f:
                if not found_test:
                    if f"Running test {testname}" in line:
                        found_test = True
                    continue

                match = re.match(
                    r"^(.*?)test phase (?P<phase>[^\s]+): (?P<status>.*)$",
                    line,
                )
                if match and match.group("phase") == phase_name:
                    return match.group("status"), None

                if "CROSSWEAVE ERROR: " in line:
                    return "FAIL", line.split("CROSSWEAVE ERROR: ")[1].strip()

    return None, None


@Command(
    "tps-test",
    category="testing",
    description="Run TPS tests.",
)
@CommandArgument(
    "--testfile",
    required=False,
    default=None,
    help=(
        "Path to a TPS .js test file or .json test list "
        "(default: services/sync/tests/tps/all_tests.json)"
    ),
)
@CommandArgument("--username", required=False, help="Firefox Account username")
@CommandArgument("--password", required=False, help="Firefox Account password")
@CommandArgument(
    "--auto-account",
    action="store_true",
    help="Automatically create a pre-verified test account (default: staging)",
)
@CommandArgument("--fxa-staging", action="store_true", help="Use FxA staging server")
@CommandArgument(
    "--fxa-production",
    action="store_true",
    help="Use FxA production server (not recommended for testing)",
)
@CommandArgument(
    "--binary", default=None, help="Path to Firefox binary (default: use objdir build)"
)
@CommandArgument("--logfile", default="tps.log", help="Path to log file")
@CommandArgument("--debug", action="store_true", help="Enable debug logging")
def run_tps(
    command_context,
    testfile,
    username,
    password,
    auto_account,
    fxa_staging,
    fxa_production,
    binary,
    logfile,
    debug,
):
    """Run TPS tests with a simple command-line interface."""
    from mozprofile import Profile
    from mozrunner import FirefoxRunner
    from wptserve import server

    print("Starting TPS test runner...")

    # Determine FxA server URL (Default staging)
    if fxa_staging or auto_account:
        fxa_url = "https://api-accounts.stage.mozaws.net/v1"
        fxa_staging = True
    elif fxa_production:
        fxa_url = "https://api.accounts.firefox.com/v1"
        fxa_staging = False
        print("WARNING: Using FxA PRODUCTION server")
    else:
        fxa_url = "https://api-accounts.stage.mozaws.net/v1"
        fxa_staging = True

    # FxA stage has a WAF that requires a bypass token for automation.
    fxa_ci_token = os.environ.get("TPS_FXA_CI_TOKEN")
    if fxa_staging and not fxa_ci_token:
        print(
            "ERROR: TPS_FXA_CI_TOKEN env var is required for FxA staging.\n"
            "       See testing/tps/README for how to obtain a token."
        )
        return 1

    # Handle account creation or validate credentials
    if auto_account:
        import secrets

        username = f"tps-test-{secrets.token_hex(8)}@restmail.net"
        password = secrets.token_urlsafe(16)
        print(f"   Account credentials generated: {username}")
    elif not username or not password:
        print(
            "ERROR: Either --auto-account or both --username and --password are required"
        )
        return 1

    # Build TPS extension
    print("Building TPS extension...")
    tps_xpi = _build_tps_xpi(command_context, None)

    # Determine binary path
    if not binary:
        binary = command_context.get_binary_path()
    print(f"Using Firefox binary: {binary}")

    # Resolve test target and files
    try:
        test_target = _resolve_test_target(command_context.topsrcdir, testfile)
        testfiles = _load_test_list(test_target)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as e:
        print(f"ERROR: {e}")
        return 1

    if not testfiles:
        print("ERROR: No enabled tests found")
        return 1
    print(f"Test target: {test_target}")
    print(f"Found {len(testfiles)} test file(s)")

    # Set up paths
    extensiondir = os.path.join(
        command_context.topsrcdir, "services", "sync", "tps", "extensions"
    )
    testdir = os.path.join(
        command_context.topsrcdir, "services", "sync", "tests", "tps"
    )
    logfile = os.path.abspath(logfile)
    if os.path.exists(logfile):
        os.remove(logfile)

    # Create TPS config
    config = {
        "fx_account": {
            "username": username,
            "password": password,
        },
        "auth_type": "fx_account",
        "fxaStaging": fxa_staging,
        "fxaApiUrl": fxa_url,
        "autoCreateAccount": auto_account,
        "extensiondir": extensiondir,
        "testdir": testdir,
    }

    if fxa_staging:
        print("Using FxA staging server")

    preferences = TPS_PREFERENCES.copy()
    preferences["tps.config"] = json.dumps(config)
    if fxa_ci_token:
        preferences["tps.fxa.bypassToken"] = fxa_ci_token
    if debug:
        preferences.update(TPS_DEBUG_PREFERENCES)
        print("Debug logging enabled")

    env = os.environ.copy()
    env.update(TPS_ENV)

    if sys.platform == "darwin":
        env["MOZ_DEVELOPER_REPO_DIR"] = os.path.abspath(command_context.topsrcdir)

    addon_server = server.WebTestHttpd(port=4567, doc_root=testdir)
    addon_server.start()

    def run_phase(profile, current_testfile, phase_name, testname):
        profile.set_preferences({
            "testing.tps.testFile": current_testfile,
            "testing.tps.testPhase": phase_name,
            "testing.tps.logFile": logfile,
            "testing.tps.ignoreUnusedEngines": False,
        })
        runner = FirefoxRunner(
            binary=binary,
            profile=profile,
            env=env,
            process_args=[],
        )
        runner.start()
        runner.wait(timeout=PHASE_TIMEOUT_SECONDS)
        return _extract_phase_status(logfile, testname, phase_name)

    failed_tests = []
    passed_tests = []
    try:
        for index, current_testfile in enumerate(testfiles, start=1):
            testname = os.path.basename(current_testfile)
            print(f"\nTest {index}/{len(testfiles)}: {testname}")

            try:
                test_phases = _load_test_phases(current_testfile)
            except Exception as e:
                print(f"   FAIL (phase parse failed: {e})")
                failed_tests.append(testname)
                continue

            if not isinstance(test_phases, dict) or not test_phases:
                print("   FAIL (no phases found)")
                failed_tests.append(testname)
                continue

            print(
                f"   Phases ({len(test_phases)}): {', '.join(sorted(test_phases.keys()))}"
            )

            with open(logfile, "a") as f:
                f.write(f"Running test {testname}\n")

            test_preferences = preferences.copy()
            test_preferences["tps.seconds_since_epoch"] = int(time.time())

            profiles = {}
            phase_list = []
            for phase_name, profile_name in sorted(test_phases.items()):
                if profile_name not in profiles:
                    profiles[profile_name] = Profile(
                        preferences=test_preferences.copy(), addons=[tps_xpi]
                    )
                phase_list.append((phase_name, profiles[profile_name]))

            test_failed = False
            for phase_name, profile in phase_list:
                print(f"Phase: {phase_name}")
                try:
                    status, error_line = run_phase(
                        profile, current_testfile, phase_name, testname
                    )
                except Exception as e:
                    print(f"   FAIL (phase execution failed: {e})\n")
                    test_failed = True
                    break
                if error_line:
                    print(f"   ERROR: {error_line}")

                if status == "PASS":
                    print("   PASS\n")
                else:
                    print(f"   FAIL (status: {status})\n")
                    test_failed = True
                    break

            print("Running cleanup phases...")
            for profile_name, profile in profiles.items():
                cleanup_phase = f"cleanup-{profile_name}"
                print(f"Cleanup: {profile_name}")

                try:
                    status, error_line = run_phase(
                        profile, current_testfile, cleanup_phase, testname
                    )
                except Exception as e:
                    test_failed = True
                    print(f"   Cleanup FAIL (execution failed: {e})")
                    continue
                if status != "PASS":
                    test_failed = True
                    if error_line:
                        print(f"   Cleanup ERROR: {error_line}")
                    print(f"   Cleanup FAIL (status: {status})")

            if test_failed:
                failed_tests.append(testname)
            else:
                passed_tests.append(testname)
    finally:
        addon_server.stop()

    # Final results
    print("\n" + "=" * 50)
    print(f"Passed: {len(passed_tests)}")
    print(f"Failed: {len(failed_tests)}")
    if failed_tests:
        print(f"Failed tests: {', '.join(failed_tests)}")
        print("TEST FAILED")
        print(f"Full log: {logfile}")
        return 1
    else:
        print("ALL TESTS PASSED")
        print(f"Full log: {logfile}")
        return 0
