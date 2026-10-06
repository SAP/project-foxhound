import asyncio

import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

from .. import PAUSED_EVENT, RESUMED_EVENT


async def test_step_out_from_nested_function(
    bidi_session,
    new_tab,
    enable_debugging,
    inline,
    subscribe_events,
    wait_for_event,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function helper() {
    return 10;
}

function test() {
    const a = helper();
    return a;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 5})

    on_paused = wait_for_event(PAUSED_EVENT)

    eval_task = asyncio.create_task(
        bidi_session.script.evaluate(
            expression="test()",
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )
    )

    paused_event1 = await on_paused

    assert paused_event1["line"] == 5
    assert paused_event1["callFrames"][0]["functionName"] == "helper"
    assert len(paused_event1["callFrames"]) >= 2
    assert paused_event1["callFrames"][1]["functionName"] == "test"

    on_paused2 = wait_for_event(PAUSED_EVENT)
    await bidi_session.moz.debugging.step_out(context=new_tab["context"])

    paused_event2 = await on_paused2
    assert paused_event2["line"] == 10
    assert paused_event2["callFrames"][0]["functionName"] == "test"

    await bidi_session.moz.debugging.resume(context=new_tab["context"])

    result = await eval_task
    assert result["type"] == "number"
    assert result["value"] == 10


async def test_step_out_from_top_level(
    bidi_session,
    new_tab,
    enable_debugging,
    inline,
    subscribe_events,
    wait_for_event,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function test() {
    const a = 1;
    return a;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    on_paused = wait_for_event(PAUSED_EVENT)

    eval_task = asyncio.create_task(
        bidi_session.script.evaluate(
            expression="test()",
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )
    )

    paused_event = await on_paused
    assert paused_event["line"] == 6
    assert paused_event["callFrames"][0]["functionName"] == "test"

    await bidi_session.moz.debugging.step_out(context=new_tab["context"])

    result = await eval_task
    assert result["type"] == "number"
    assert result["value"] == 1
