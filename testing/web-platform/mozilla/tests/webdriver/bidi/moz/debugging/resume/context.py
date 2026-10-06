import asyncio

import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

from .. import PAUSED_EVENT, RESUMED_EVENT


async def test_resume_from_breakpoint(
    bidi_session,
    new_tab,
    enable_debugging,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])
    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function test() {
    const x = 1;
    const y = 2;
    return x + y;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    result = await assert_pause_and_resume(new_tab, expression="test()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 3


async def test_evaluate_in_paused_frame(
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
function calculate() {
    let b;
    const a = 10;
    b = 20;
    const sum = a + b;
    return sum;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 7})
    await set_breakpoint(location={"url": url, "line": 8})

    on_paused = wait_for_event(PAUSED_EVENT)

    eval_task = asyncio.create_task(
        bidi_session.script.evaluate(
            expression="calculate()",
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )
    )

    # Wait for the pause on line 7 `b = 20;`. Variable `a` should already
    # be at 10, variable `b` should be undefined.
    paused_event = await on_paused
    assert paused_event["context"] == new_tab["context"]
    assert paused_event["line"] == 7

    result_a = await bidi_session.script.evaluate(
        expression="a", target=ContextTarget(new_tab["context"]), await_promise=False
    )
    assert result_a["type"] == "number"
    assert result_a["value"] == 10

    result_b = await bidi_session.script.evaluate(
        expression="typeof b",
        target=ContextTarget(new_tab["context"]),
        await_promise=False,
    )
    assert result_b["type"] == "string"
    assert result_b["value"] == "undefined"

    # Resume and break at line 8 now. Variable `a` should still be at 10,
    # variable `b` should be set to 20 now.
    on_paused = wait_for_event(PAUSED_EVENT)
    await bidi_session.moz.debugging.resume(context=new_tab["context"])
    paused_event = await on_paused
    assert paused_event["context"] == new_tab["context"]
    assert paused_event["line"] == 8

    result_a = await bidi_session.script.evaluate(
        expression="a", target=ContextTarget(new_tab["context"]), await_promise=False
    )
    assert result_a["type"] == "number"
    assert result_a["value"] == 10

    result_b = await bidi_session.script.evaluate(
        expression="b", target=ContextTarget(new_tab["context"]), await_promise=False
    )
    assert result_b["type"] == "number"
    assert result_b["value"] == 20

    await bidi_session.script.evaluate(
        expression="b = 32",
        target=ContextTarget(new_tab["context"]),
        await_promise=False,
    )

    result_b = await bidi_session.script.evaluate(
        expression="b", target=ContextTarget(new_tab["context"]), await_promise=False
    )
    assert result_b["type"] == "number"
    assert result_b["value"] == 32

    await bidi_session.moz.debugging.resume(context=new_tab["context"])

    result = await eval_task
    assert result["type"] == "number"

    assert result["value"] == 42
