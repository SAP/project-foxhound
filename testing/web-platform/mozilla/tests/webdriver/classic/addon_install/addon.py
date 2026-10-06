import pytest
from support.addons import (
    get_ids_for_installed_addons,
    is_addon_private_browsing_allowed,
    is_addon_temporary_installed,
)
from tests.support.classic.asserts import assert_error, assert_success
from tests.support.helpers import get_base64_for_extension_file
from tests.support.sync import Poll
from webdriver import error

from . import ADDON_ID, install_addon, uninstall_addon


def test_install_invalid_addon(session):
    response = install_addon(session, "addon", "aGVsbG8=")
    assert_error(response, "unknown error")


@pytest.mark.allow_system_access
@pytest.mark.parametrize("value", [True, False], ids=["required", "not required"])
def test_install_unsigned_addon_with_signature(session, use_pref, value):
    # Even though "xpinstall.signatures.required" preference is enabled in Firefox by default,
    # it's disabled for wpt tests, so test both values here.
    use_pref("xpinstall.signatures.required", value)

    response = install_addon(
        session, "addon", get_base64_for_extension_file("firefox/unsigned.xpi"), False
    )

    if value is True:
        assert_error(response, "unknown error")
    else:
        addon_id = assert_success(response)

        installed_addon_ids = get_ids_for_installed_addons(session)

        try:
            assert addon_id in installed_addon_ids
            assert addon_id == ADDON_ID
            assert is_addon_temporary_installed(session, addon_id) is False
        finally:
            # Clean up the addon.
            uninstall_addon(session, addon_id)


@pytest.mark.allow_system_access
def test_install_unsigned_addon_temporarily(session):
    response = install_addon(
        session, "addon", get_base64_for_extension_file("firefox/unsigned.xpi"), True
    )
    addon_id = assert_success(response)

    installed_addon_ids = get_ids_for_installed_addons(session)

    try:
        assert addon_id in installed_addon_ids
        assert addon_id == ADDON_ID
        assert is_addon_temporary_installed(session, addon_id) is True
    finally:
        # Clean up the addon.
        uninstall_addon(session, addon_id)


@pytest.mark.allow_system_access
@pytest.mark.parametrize("temporary", [True, False])
def test_install_signed_addon(session, temporary):
    response = install_addon(
        session, "addon", get_base64_for_extension_file("firefox/signed.xpi"), temporary
    )
    addon_id = assert_success(response)

    installed_addon_ids = get_ids_for_installed_addons(session)

    try:
        assert addon_id in installed_addon_ids
        assert addon_id == ADDON_ID
        assert is_addon_temporary_installed(session, addon_id) is temporary
    finally:
        # Clean up the addon.
        uninstall_addon(session, addon_id)


@pytest.mark.allow_system_access
def test_install_temporary_addon_with_content_script(session, inline):
    response = install_addon(
        session,
        "addon",
        get_base64_for_extension_file("firefox/content-script.xpi"),
        True,
    )
    addon_id = assert_success(response)

    try:
        assert addon_id == ADDON_ID
        assert addon_id in get_ids_for_installed_addons(session)

        # Navigate to a page matched by the content script, which appends a
        # marker element to the document once it runs.
        session.url = inline("<div>foo</div>")

        wait = Poll(
            session,
            timeout=5,
            ignored_exceptions=error.NoSuchElementException,
            message="Content script did not inject the marker element",
        )
        marker = wait.until(lambda s: s.find.css("#content-script-marker", all=False))
        assert marker.text == "content script executed"
    finally:
        # Clean up the addon.
        uninstall_addon(session, addon_id)


@pytest.mark.allow_system_access
@pytest.mark.parametrize("allow_private_browsing", [True, False])
def test_install_addon_with_private_browsing(session, allow_private_browsing):
    response = install_addon(
        session,
        "addon",
        get_base64_for_extension_file("firefox/signed.xpi"),
        False,
        allow_private_browsing,
    )
    addon_id = assert_success(response)

    installed_addon_ids = get_ids_for_installed_addons(session)

    try:
        assert addon_id in installed_addon_ids
        assert addon_id == ADDON_ID
        assert (
            is_addon_private_browsing_allowed(session, addon_id)
            is allow_private_browsing
        )
    finally:
        # Clean up the addon.
        uninstall_addon(session, addon_id)
