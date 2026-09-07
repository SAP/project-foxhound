# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import argparse
import getpass
import importlib.util
import json
import os
import subprocess
import urllib.request
from pathlib import Path
from typing import Optional

try:
    import tomllib
# FIXME: remove fallback once python3.11 is the lowest supported
except ImportError:
    import tomli as tomllib
from mach.decorators import Command, CommandArgument, SubCommand
from mozbuild.base import MachCommandBase

# Firefox Account OAuth configuration
FXA_SCOPES = ("profile",)
FXA_CLIENT_ID = "5882386c6d801776"
FXA_ACCOUNT_SERVER_URL = "https://api.accounts.firefox.com"
FXA_OAUTH_SERVER_URL = "https://oauth.accounts.firefox.com"
ON_TRY = "MOZ_AUTOMATION" in os.environ


def _dispatch_perftest(mach_context, test_path: str, extra_args: Optional[list] = None):
    perftest_args = [test_path]

    if extra_args:
        # Strip leading dashes so mochitest args match perftest expectations.
        extra_args = [arg.lstrip("-") for arg in extra_args]
        perftest_args.extend(["--mochitest-extra-args", *extra_args])

    # Forward directly to perftest with translated mochitest arguments.
    return mach_context.commands.dispatch(
        "perftest",
        mach_context,
        perftest_args,
    )


class EvalCommand(MachCommandBase):
    """Forward eval runs to mozperftest and mochitests."""

    @Command(
        "eval",
        category="testing",
        description="Run evaluation tests, backed by perftests and mochitests.",
    )
    @CommandArgument(
        "test_path",
        help="The path to an individual .js test or a .toml manifest relative to the "
        "repo root. The test must be an evaluation test located in a browser_eval folder.",
    )
    @CommandArgument(
        "extra_args",
        nargs=argparse.REMAINDER,
        help="Additional mochitest arguments passed through to perftest.",
    )
    def run_eval(self, test_path: str, extra_args: Optional[list] = None):
        if Path(test_path).is_dir():
            test_path = str(Path(test_path) / "eval.toml")
        if Path(test_path).suffix not in (".js", ".toml"):
            print(
                "Error: test_path must be a .js test file or a .toml manifest or a dir with an eval.toml."
            )
            return 1
        if not Path(test_path).exists():
            print(f"Error: {test_path} does not exist.")
            return 1
        if test_path.endswith(".toml"):
            with open(test_path, "rb") as f:
                manifest = tomllib.load(f)
            toml_dir = Path(test_path).resolve().parent
            test_files = [
                str(toml_dir / key) for key in manifest if key.endswith(".js")
            ]
            print(f"Discovered {len(test_files)} test(s) in manifest {test_path}:")
            for test_file in test_files:
                print(f"  {test_file}")
            if not test_files:
                print(f"No JavaScript tests found in {test_path}")
                return 1
            result = 0
            for test_file in test_files:
                r = _dispatch_perftest(self._mach_context, test_file, extra_args)
                if r:
                    return r
            return result

        return _dispatch_perftest(self._mach_context, test_path, extra_args)


def _get_fxa_token(mach_cmd):
    mach_cmd.activate_virtualenv()
    if importlib.util.find_spec("fxa") is None:
        try:
            mach_cmd.virtualenv_manager.install_pip_package("PyFxA==0.8.1")
        except Exception as exception:
            print(f"Failed to install 'fxa' package: {exception}")
            raise exception

    from fxa import core, oauth
    from fxa.errors import ClientError
    from fxa.tools.bearer import get_bearer_token
    from fxa.tools.unblock import send_unblock_code

    print("Login to your Firefox Account (accounts.firefox.com)")
    email = input("Email: ").strip()
    password = getpass.getpass("Password: ").strip()

    try:
        token = get_bearer_token(
            email,
            password,
            scopes=FXA_SCOPES,
            client_id=FXA_CLIENT_ID,
            account_server_url=FXA_ACCOUNT_SERVER_URL,
            oauth_server_url=FXA_OAUTH_SERVER_URL,
        )
    except ClientError as exception:
        try:
            if "Unconfirmed session" not in str(exception):
                raise

            try:
                send_unblock_code(email, FXA_ACCOUNT_SERVER_URL)
            except ClientError:
                print("Login failed: unable to send unblock code.")
                raise exception

            print("\nAn authorization code was sent to your email, enter it here.")
            unblock_code = input("Code: ").strip()

            try:
                # Attempt to login without 2 factor authentication.
                session = core.Client(server_url=FXA_ACCOUNT_SERVER_URL).login(
                    email,
                    password,
                    unblock_code=unblock_code,
                )
                token = oauth.Client(
                    client_id=FXA_CLIENT_ID,
                    server_url=FXA_OAUTH_SERVER_URL,
                ).authorize_token(session, " ".join(FXA_SCOPES))
            except ClientError:
                # Two factor is required, try again.
                session = core.Client(server_url=FXA_ACCOUNT_SERVER_URL).login(
                    email,
                    password,
                    unblock_code=unblock_code,
                    verification_method="totp-2fa",
                )

                print(
                    "\nTwo-factor authorization is enabled, open your app and enter the code:"
                )
                totp_code = input("Code: ").strip()
                if not session.totp_verify(totp_code):
                    print("Login failed: invalid two-factor code.")
                    raise ClientError("Invalid two-factor code.")

                token = oauth.Client(
                    client_id=FXA_CLIENT_ID,
                    server_url=FXA_OAUTH_SERVER_URL,
                ).authorize_token(session, " ".join(FXA_SCOPES))

        except Exception as retry_exception:
            print(f"Login failed: {retry_exception}")
            raise retry_exception
    except Exception as exception:
        print(f"Login failed: {exception}")
        raise exception
    return token


def _get_mlpa_token():
    project_id = "moz-fx-llm-proxy-nonprod-fd0e"
    environment = "stage"
    secret_name = f"{environment}-gke-app-secrets"
    url = (
        f"https://secretmanager.googleapis.com/v1"
        f"/projects/{project_id}/secrets/{secret_name}/versions/latest:access"
    )
    access_token = subprocess.check_output(
        ["gcloud", "auth", "print-access-token"], text=True
    ).strip()
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {access_token}"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    import base64

    payload = json.loads(base64.b64decode(data["payload"]["data"]))
    token = payload["mlpa-experimentation-authorization-token"]
    return token


class EvalToolsCommand(MachCommandBase):
    """Helper utilities for eval workflows."""

    @Command(
        "eval-tools",
        category="testing",
        description="Helper utilities for ML evals.",
    )
    def eval_tools(self):
        print("Eval helper utilities.\n\nRun `./mach eval-tools --help` for details.")
        return 0

    @SubCommand(
        "eval-tools",
        "login",
        description="Login helper to fetch a bearer token (interactive).",
    )
    def eval_tools_login(self):
        if ON_TRY:
            print("This command is not intended to be run in try/CI environments.")
            return 1
        if os.environ.get("MOZ_FXA_BEARER_TOKEN"):
            print("MOZ_FXA_BEARER_TOKEN already set; skipping login.")
            print("Unset with:\nunset MOZ_FXA_BEARER_TOKEN")
            fxa_token = os.environ.get("MOZ_FXA_BEARER_TOKEN")
        else:
            try:
                fxa_token = _get_fxa_token(self)
            except Exception as exception:
                print(f"Error during FXA login: {exception}")
                return 1

        if os.environ.get("MOZ_MLPA_AUTHORIZATION_TOKEN"):
            print(
                "MOZ_MLPA_AUTHORIZATION_TOKEN already set; skipping MLPA token fetch."
            )
            print("Unset with:\nunset MOZ_MLPA_AUTHORIZATION_TOKEN")
            mlpa_token = os.environ.get("MOZ_MLPA_AUTHORIZATION_TOKEN")
        else:
            try:
                mlpa_token = _get_mlpa_token()
            except Exception as exception:
                print(f"Error fetching MLPA token: {exception}")
                return 1

        # don't print tokens in CI/try to avoid leaking secrets in logs
        if not ON_TRY:
            print(
                "\nCopy and paste the following in your terminal to persist your login:\n"
            )
            print(f" export MOZ_FXA_BEARER_TOKEN='{fxa_token}'")
            print(f" export MOZ_MLPA_AUTHORIZATION_TOKEN='{mlpa_token}'")
        return 0
