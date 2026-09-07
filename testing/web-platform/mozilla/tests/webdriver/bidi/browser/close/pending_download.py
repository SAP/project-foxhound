import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

DOWNLOAD_WILL_BEGIN = "browsingContext.downloadWillBegin"


async def test_close_with_pending_download(
    new_session, add_browser_capabilities, inline, event_loop, wait_for_future_safe
):
    bidi_session = await new_session(
        capabilities={"alwaysMatch": add_browser_capabilities({})}
    )

    new_tab = await bidi_session.browsing_context.create(type_hint="tab")

    url = inline(
        """<a id="download_link" href="/_mozilla/webdriver/support/assets/big.png" download>download</a>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await bidi_session.session.subscribe(events=[DOWNLOAD_WILL_BEGIN])

    on_download_will_begin_future = event_loop.create_future()

    async def on_event(_, data):
        remove_listener()
        on_download_will_begin_future.set_result(data)

    remove_listener = bidi_session.add_event_listener(DOWNLOAD_WILL_BEGIN, on_event)

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

    await wait_for_future_safe(on_download_will_begin_future)

    await bidi_session.browser.close()

    # Wait for the browser to actually close.
    bidi_session.current_browser.wait()

    assert bidi_session.current_browser.is_running is False
