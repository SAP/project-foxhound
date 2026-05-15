# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import argparse
import getpass
import importlib.util
import os
from typing import Optional

from mach.decorators import Command, CommandArgument, SubCommand
from mozbuild.base import MachCommandBase

# Firefox Account OAuth configuration
FXA_SCOPES = ("profile",)
FXA_CLIENT_ID = "5882386c6d801776"
FXA_ACCOUNT_SERVER_URL = "https://api.accounts.firefox.com"
FXA_OAUTH_SERVER_URL = "https://oauth.accounts.firefox.com"


class EvalCommand(MachCommandBase):
    """Forward eval runs to mozperftest and mochitests."""

    @Command(
        "eval",
        category="testing",
        description="Run evaluation tests, backed by perftests and mochitests.",
    )
    @CommandArgument(
        "test_path",
        help="The path to an individual test relative to the repo root. The test must "
        "be an evaluation test located in a browser_eval folder. Multiple tests are not"
        "supported.",
    )
    @CommandArgument(
        "extra_args",
        nargs=argparse.REMAINDER,
        help="Additional mochitest arguments passed through to perftest.",
    )
    def run_eval(self, test_path: str, extra_args: Optional[list] = None):
        perftest_args = [test_path]

        if extra_args:
            # Strip leading dashes so mochitest args match perftest expectations.
            extra_args = [arg.lstrip("-") for arg in extra_args]
            perftest_args.extend(["--mochitest-extra-args", *extra_args])

        # Forward directly to perftest with translated mochitest arguments.
        return self._mach_context.commands.dispatch(
            "perftest",
            self._mach_context,
            perftest_args,
        )


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
        if os.environ.get("MOZ_FXA_BEARER_TOKEN"):
            print("MOZ_FXA_BEARER_TOKEN already set; skipping login.")
            print("Unset with: unset MOZ_FXA_BEARER_TOKEN")
            return 0

        self.activate_virtualenv()
        if importlib.util.find_spec("fxa") is None:
            try:
                self.virtualenv_manager.install_pip_package("PyFxA==0.8.1")
            except Exception as exception:
                print(f"Failed to install 'fxa' package: {exception}")
                return 1

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
                    return 1

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
                        return 1

                    token = oauth.Client(
                        client_id=FXA_CLIENT_ID,
                        server_url=FXA_OAUTH_SERVER_URL,
                    ).authorize_token(session, " ".join(FXA_SCOPES))

            except Exception as retry_exception:
                print(retry_exception)
                print(f"Login failed: {retry_exception}")
                return 1
        except Exception as exception:
            print(exception)
            print(f"Login failed: {exception}")
            return 1

        print(
            "\nCopy and paste the following in your terminal to persist your login:\n"
        )
        print(f" export MOZ_FXA_BEARER_TOKEN='{token}'")
        return 0
