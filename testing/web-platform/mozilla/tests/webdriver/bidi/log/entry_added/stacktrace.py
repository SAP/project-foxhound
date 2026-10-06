import pytest

pytestmark = pytest.mark.asyncio

LOG_ENTRY_ADDED = "log.entryAdded"


@pytest.mark.parametrize(
    "log_method",
    [
        "debug",
        "info",
        "log",
        "table",
        "warn",
    ],
)
async def test_console_entry_top_frame(
    bidi_session,
    subscribe_events,
    new_tab,
    inline,
    wait_for_event,
    wait_for_future_safe,
    log_method,
):
    await subscribe_events(events=[LOG_ENTRY_ADDED])

    on_entry_added = wait_for_event(LOG_ENTRY_ADDED)

    url = inline(
        f"""
        <script>
            function foo() {{ console.{log_method}("cheese"); }}
            function bar() {{ foo(); }}
            bar();
        </script>
        """
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    event_data = await wait_for_future_safe(on_entry_added)

    assert "stackTrace" in event_data
    assert "callFrames" in event_data["stackTrace"]

    assert event_data["stackTrace"]["callFrames"] == [
        {"columnNumber": 37, "functionName": "foo", "lineNumber": 4, "url": url}
    ]
