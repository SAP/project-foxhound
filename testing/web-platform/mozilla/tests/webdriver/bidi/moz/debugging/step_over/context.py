import asyncio

import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

from .. import PAUSED_EVENT, RESUMED_EVENT


async def test_step_over_basic(
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
    const b = 2;
    const c = 3;
    return a + b + c;
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

    paused_event1 = await on_paused
    assert paused_event1["line"] == 6

    on_paused2 = wait_for_event(PAUSED_EVENT)
    await bidi_session.moz.debugging.step_over(context=new_tab["context"])

    paused_event2 = await on_paused2
    assert paused_event2["line"] == 7
    assert paused_event2["url"] == url

    on_paused3 = wait_for_event(PAUSED_EVENT)
    await bidi_session.moz.debugging.step_over(context=new_tab["context"])

    paused_event3 = await on_paused3
    assert paused_event3["line"] == 8

    await bidi_session.moz.debugging.resume(context=new_tab["context"])

    result = await eval_task
    assert result["type"] == "number"
    assert result["value"] == 6


async def test_step_over_skips_function_call(
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
    const x = 10;
    return x * 2;
}

function test() {
    const a = 1;
    const b = helper();
    const c = 3;
    return a + b + c;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 11})

    on_paused = wait_for_event(PAUSED_EVENT)

    eval_task = asyncio.create_task(
        bidi_session.script.evaluate(
            expression="test()",
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )
    )

    paused_event1 = await on_paused
    assert paused_event1["line"] == 11

    on_paused2 = wait_for_event(PAUSED_EVENT)
    await bidi_session.moz.debugging.step_over(context=new_tab["context"])

    paused_event2 = await on_paused2
    assert paused_event2["line"] == 12
    assert paused_event2["url"] == url

    assert len(paused_event2["callFrames"]) >= 1
    assert paused_event2["callFrames"][0]["functionName"] == "test"

    await bidi_session.moz.debugging.resume(context=new_tab["context"])

    result = await eval_task
    assert result["type"] == "number"
    assert result["value"] == 24
