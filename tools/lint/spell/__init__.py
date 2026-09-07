# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import re
import subprocess

# py2-compat
try:
    from json.decoder import JSONDecodeError
except ImportError:
    JSONDecodeError = ValueError

from mozfile import which
from mozlint import result
from mozlint.util.implementation import LintProcess

here = os.path.abspath(os.path.dirname(__file__))

CODESPELL_NOT_FOUND = """
Could not find codespell!
""".strip()


CODESPELL_FORMAT_REGEX = re.compile(r"(.*):(.*): (.*) ==> (.*)$")


class CodespellProcess(LintProcess):
    def __init__(self, config, cmd, results, fix=False):
        super().__init__(config, cmd)
        self.results = results
        self.fix = fix
        self.fixed = 0

    def process_line(self, line):
        try:
            match = CODESPELL_FORMAT_REGEX.match(line)
            abspath, line, typo, correct = match.groups()
        except AttributeError:
            if "FIXED: " not in line:
                print(f"Unable to match regex against output: {line}")
            return

        if self.fix:
            self.fixed += 1

        # Ignore false positive like aParent (which would be fixed to apparent)
        # See https://github.com/lucasdemarchi/codespell/issues/314
        m = re.match(r"^[a-z][A-Z][a-z]*", typo)
        if m:
            return
        res = {
            "path": abspath,
            "message": typo.strip() + " ==> " + correct,
            "level": "error",
            "lineno": line,
        }
        self.results.append(result.from_config(self.config, **res))


def run_process(config, cmd, results, fix=False):
    proc = CodespellProcess(config, cmd, results, fix)
    proc.run()
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.kill()
    return proc


def get_codespell_binary():
    """
    Returns the path of the first codespell binary available
    if not found returns None
    """
    binary = os.environ.get("CODESPELL")
    if binary:
        return binary

    return which("codespell")


def get_codespell_version(binary):
    return subprocess.check_output(
        [which("python"), binary, "--version"],
        universal_newlines=True,
        stderr=subprocess.STDOUT,
    )


def get_ignored_words_file(config):
    config_root = os.path.dirname(config["path"])
    return os.path.join(config_root, "spell", "exclude-list.txt")


def lint(paths, config, fix=None, **lintargs):
    log = lintargs["log"]
    binary = get_codespell_binary()
    if not binary:
        print(CODESPELL_NOT_FOUND)
        if "MOZ_AUTOMATION" in os.environ:
            return 1
        return []

    config["root"] = lintargs["root"]

    exclude_list = get_ignored_words_file(config)
    cmd_args = [
        which("python"),
        binary,
        "--disable-colors",
        # Silence some warnings:
        # 1: disable warnings about wrong encoding
        # 2: disable warnings about binary file
        # 4: shut down warnings about automatic fixes
        #    that were disabled in dictionary.
        "--quiet-level=7",
        "--ignore-words=" + exclude_list,
    ]

    if "exclude" in config:
        cmd_args.append("--skip=*.dic,{}".format(",".join(config["exclude"])))

    log.debug("Command: {}".format(" ".join(cmd_args)))
    log.debug(f"Version: {get_codespell_version(binary)}")

    results = []
    fixed = 0

    base_command = cmd_args + paths
    proc = run_process(config, base_command, results, fix=bool(fix))

    if fix:
        fixed = proc.fixed
        results.clear()
        cmd_args.append("--write-changes")
        log.debug("Command: {}".format(" ".join(cmd_args)))
        log.debug(f"Version: {get_codespell_version(binary)}")
        base_command = cmd_args + paths
        proc = run_process(config, base_command, results, fix=True)
        fixed += proc.fixed - len(results)

    return {"results": results, "fixed": fixed}
