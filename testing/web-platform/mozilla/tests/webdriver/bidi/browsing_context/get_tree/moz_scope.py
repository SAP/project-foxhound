import pytest
from tests.bidi.browsing_context import assert_browsing_context
from webdriver.bidi import error

pytestmark = pytest.mark.asyncio


async def test_without_system_access(bidi_session):
    with pytest.raises(error.UnsupportedOperationException):
        await bidi_session.browsing_context.get_tree(
            _extension_params={"moz:scope": "chrome"}
        )


@pytest.mark.allow_system_access
async def test_multiple_browser_windows(
    bidi_session, new_window, top_context, browser_chrome_url
):
    # Retrieve the top-level browsing context for all the open browser windows
    parent_contexts = await bidi_session.browsing_context.get_tree(
        max_depth=0, _extension_params={"moz:scope": "chrome"}
    )

    assert len(parent_contexts) == 2

    assert_browsing_context(
        parent_contexts[0],
        None,
        children=None,
        parent=None,
        url=browser_chrome_url,
        client_window=top_context["clientWindow"],
    )
    assert parent_contexts[0]["context"] != top_context["context"]

    assert parent_contexts[0]["moz:scope"] == "chrome"

    assert_browsing_context(
        parent_contexts[1],
        None,
        children=None,
        parent=None,
        url=browser_chrome_url,
        client_window=new_window["clientWindow"],
    )
    assert parent_contexts[1]["context"] != new_window["context"]
    assert parent_contexts[1]["clientWindow"] != top_context["clientWindow"]

    assert parent_contexts[1]["moz:scope"] == "chrome"

    assert parent_contexts[0]["context"] != parent_contexts[1]["context"]


@pytest.mark.allow_system_access
async def test_custom_chrome_window_without_iframes(
    bidi_session, top_context, default_chrome_handler, new_chrome_window
):
    # Bug 1762066: Skip this test on Android, as it currently causes the browser to crash
    # when attempting to register a chrome handler for files that cannot be found.
    # Since we cannot disable the test via the manifest, we return early instead.
    if bidi_session.capabilities["platformName"] == "android":
        return

    chrome_url = f"{default_chrome_handler}test_dialog.xhtml"
    new_window = new_chrome_window(chrome_url)

    # Retrieve all browsing contexts for the custom chrome window
    parent_contexts = await bidi_session.browsing_context.get_tree(
        max_depth=None, _extension_params={"moz:scope": "chrome"}
    )

    assert len(parent_contexts) == 2

    filtered_contexts = [
        context for context in parent_contexts if context["context"] == new_window.id
    ]

    assert len(filtered_contexts) == 1

    assert_browsing_context(
        filtered_contexts[0],
        new_window.id,
        children=0,
        parent=None,
        url=chrome_url,
        client_window=None,
    )

    assert filtered_contexts[0]["clientWindow"] != top_context["clientWindow"]

    assert filtered_contexts[0]["moz:scope"] == "chrome"
    assert filtered_contexts[0]["moz:name"] == "null"


@pytest.mark.allow_system_access
async def test_custom_chrome_window_with_iframes(
    bidi_session, top_context, default_chrome_handler, new_chrome_window
):
    # Bug 1762066: Skip this test on Android, as it currently causes the browser to crash
    # when attempting to register a chrome handler for files that cannot be found.
    # Since we cannot disable the test via the manifest, we return early instead.
    if bidi_session.capabilities["platformName"] == "android":
        return

    chrome_url = f"{default_chrome_handler}test.xhtml"
    iframe_url = f"{default_chrome_handler}test_iframe.xhtml"
    nested_iframe_url = f"{default_chrome_handler}test_nested_iframe.xhtml"

    new_window = new_chrome_window(chrome_url)

    # Retrieve all browsing contexts for the custom chrome window
    parent_contexts = await bidi_session.browsing_context.get_tree(
        _extension_params={"moz:scope": "chrome"}
    )

    assert len(parent_contexts) == 2

    filtered_contexts = [
        context for context in parent_contexts if context["context"] == new_window.id
    ]

    assert len(filtered_contexts) == 1

    assert_browsing_context(
        filtered_contexts[0],
        new_window.id,
        children=2,
        parent=None,
        url=chrome_url,
        client_window=None,
    )
    assert filtered_contexts[0]["clientWindow"] != top_context["clientWindow"]

    assert filtered_contexts[0]["moz:scope"] == "chrome"
    assert filtered_contexts[0]["moz:name"] == "null"

    iframes = filtered_contexts[0]["children"]

    # First iframe has no children
    assert_browsing_context(
        iframes[0],
        None,
        children=0,
        parent_expected=False,
        url=iframe_url,
        client_window=filtered_contexts[0]["clientWindow"],
    )
    assert iframes[0]["context"] != filtered_contexts[0]["context"]

    assert iframes[0]["moz:scope"] == "chrome"
    assert iframes[0]["moz:name"] == "iframe"

    # Second iframe has a children
    assert_browsing_context(
        iframes[1],
        None,
        children=1,
        parent_expected=False,
        url=nested_iframe_url,
        client_window=filtered_contexts[0]["clientWindow"],
    )
    assert iframes[1]["context"] != filtered_contexts[0]["context"]
    assert iframes[1]["context"] != iframes[0]["context"]

    assert iframes[1]["moz:scope"] == "chrome"
    assert iframes[1]["moz:name"] == "iframe-nested"

    nested_iframes = iframes[1]["children"]

    # Second iframe has a children
    assert_browsing_context(
        nested_iframes[0],
        None,
        children=0,
        parent_expected=False,
        url=iframe_url,
        client_window=filtered_contexts[0]["clientWindow"],
    )
    assert iframes[1]["context"] != filtered_contexts[0]["context"]
    assert iframes[1]["context"] != iframes[0]["context"]
    assert nested_iframes[0]["context"] != iframes[1]["context"]
    assert nested_iframes[0]["context"] != filtered_contexts[0]["context"]

    assert nested_iframes[0]["moz:scope"] == "chrome"
    assert nested_iframes[0]["moz:name"] == "iframe"


@pytest.mark.allow_system_access
async def test_child_context_without_chrome_scope(
    bidi_session, default_chrome_handler, new_chrome_window
):
    # Bug 1762066: Skip this test on Android, as it currently causes the browser to crash
    # when attempting to register a chrome handler for files that cannot be found.
    # Since we cannot disable the test via the manifest, we return early instead.
    if bidi_session.capabilities["platformName"] == "android":
        return

    chrome_url = f"{default_chrome_handler}test.xhtml"
    iframe_url = f"{default_chrome_handler}test_iframe.xhtml"

    new_window = new_chrome_window(chrome_url)

    # Retrieve all browsing contexts for the custom chrome window
    top_level_contexts = await bidi_session.browsing_context.get_tree(
        root=new_window.id, max_depth=1
    )

    assert len(top_level_contexts) == 1

    assert_browsing_context(
        top_level_contexts[0],
        new_window.id,
        children=2,
        parent=None,
        url=chrome_url,
        client_window=None,
    )

    iframes = top_level_contexts[0]["children"]

    assert len(iframes) == 2

    # Check that child chrome browsing context are still returned
    assert_browsing_context(
        iframes[0],
        None,
        children=None,
        parent_expected=False,
        url=iframe_url,
        client_window=top_level_contexts[0]["clientWindow"],
    )
