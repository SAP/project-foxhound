import tempfile

import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio


DOWNLOAD_WILL_BEGIN = "browsingContext.downloadWillBegin"
DOWNLOAD_END = "browsingContext.downloadEnd"


# In this test case, we want to verify that if there is already
# a downloaded file in the default download folder, saving a file
# with the same filename as the previous file in a custom download folder
# with "browser.setDownloadBehavior" would result in the unique file name
# based on the state of the custom folder.
# Since this requirement is not specified in the specification,
# the test is in the Mozilla-specific folder.
async def test_unique_filename(
    bidi_session,
    new_tab,
    inline,
    subscribe_events,
    wait_for_event,
    wait_for_future_safe,
):
    await subscribe_events(events=[DOWNLOAD_END])
    url = inline(
        """<a id="download_link" href="/_mozilla/webdriver/support/assets/big.png" download>download</a>"""
    )
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )
    on_download_end = wait_for_event(DOWNLOAD_END)

    # Trigger download to populate default download folder.
    result = await bidi_session.browsing_context.locate_nodes(
        context=new_tab["context"], locator={"type": "css", "value": "#download_link"}
    )

    await bidi_session.script.call_function(
        arguments=[result["nodes"][0]],
        function_declaration="(link) => link.click()",
        target=ContextTarget(new_tab["context"]),
        await_promise=True,
        user_activation=True,
    )

    await wait_for_future_safe(on_download_end)

    await subscribe_events(events=[DOWNLOAD_WILL_BEGIN])

    await bidi_session.browser.set_download_behavior(
        download_behavior={"type": "allowed", "destinationFolder": tempfile.mkdtemp()}
    )

    on_download_will_begin = wait_for_event(DOWNLOAD_WILL_BEGIN)
    on_download_end = wait_for_event(DOWNLOAD_END)

    # Trigger the download.
    await bidi_session.script.call_function(
        arguments=[result["nodes"][0]],
        function_declaration="(link) => link.click()",
        target=ContextTarget(new_tab["context"]),
        await_promise=True,
        user_activation=True,
    )

    event = await wait_for_future_safe(on_download_will_begin)

    filename = "big.png"

    # Verify that the file name is unique in the temporary folder.
    assert event["suggestedFilename"] == filename

    await wait_for_future_safe(on_download_end)

    # Trigger another download.
    on_download_will_begin = wait_for_event(DOWNLOAD_WILL_BEGIN)

    await bidi_session.script.call_function(
        arguments=[result["nodes"][0]],
        function_declaration="(link) => link.click()",
        target=ContextTarget(new_tab["context"]),
        await_promise=True,
        user_activation=True,
    )

    event = await wait_for_future_safe(on_download_will_begin)

    # Verify that the file name contains "big" but not equal to "big.png".
    assert "big" in event["suggestedFilename"]
    assert event["suggestedFilename"] != filename

    await bidi_session.browser.set_download_behavior(download_behavior=None)
