import asyncio

import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

from .. import PAUSED_EVENT, RESUMED_EVENT


async def test_set_breakpoint_simple(
    bidi_session, new_tab, enable_debugging, inline, set_breakpoint
):
    await enable_debugging(contexts=[new_tab["context"]])

    # inline() generates:
    # Line 1: <!doctype html>
    # Line 2: <meta charset=UTF-8>
    # Line 3: <script>
    # Line 4: function foo() {
    # Line 5:     const x = 42;
    # Line 6:     return x;
    url = inline(
        """<script>
function foo() {
    const x = 42;
    return x;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})


async def test_set_breakpoint_and_pause(
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
function foo() {
    const x = 42;
    return x;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    await set_breakpoint(location={"url": url, "line": 6})

    result = await assert_pause_and_resume(new_tab, expression="foo()", line=6)
    assert result["type"] == "number"
    assert result["value"] == 42


async def test_breakpoint_with_column(
    bidi_session,
    new_tab,
    enable_debugging,
    inline,
    subscribe_events,
    assert_pause_and_resume,
    set_breakpoint,
    wait_for_event,
):
    await subscribe_events([PAUSED_EVENT, RESUMED_EVENT])

    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function bar() {
    let y, z;
    y = 10; z = 42;
    return y * z;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    # Line 1: <!doctype html>
    # Line 2: <meta charset=UTF-8>
    # Line 3: <script>
    # Line 4: function bar() {
    # Line 5:     let y, z;
    # Line 6:     y = 10; z = 42;
    #             ^       ^
    # Columns:    5       13
    await set_breakpoint(location={"url": url, "line": 6, "column": 5})
    await set_breakpoint(location={"url": url, "line": 6, "column": 13})

    on_paused = wait_for_event(PAUSED_EVENT)

    eval_task = asyncio.create_task(
        bidi_session.script.evaluate(
            expression="bar()",
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )
    )
    paused_event = await on_paused
    assert paused_event["context"] == new_tab["context"]
    assert paused_event["line"] == 6
    assert paused_event["column"] == 5

    async def assert_value(variable_name, expected_value):
        expect_undefined = expected_value is None
        expression = (
            variable_name if not expect_undefined else f"typeof {variable_name}"
        )
        result = await bidi_session.script.evaluate(
            expression=expression,
            target=ContextTarget(new_tab["context"]),
            await_promise=False,
        )

        if expect_undefined:
            assert result["type"] == "string"
            assert result["value"] == "undefined"
        else:
            assert result["type"] == "number"
            assert result["value"] == expected_value

    # At column 5, y and z should be undefined
    await assert_value("y", expected_value=None)
    await assert_value("z", expected_value=None)

    # Resume
    on_paused = wait_for_event(PAUSED_EVENT)
    await bidi_session.moz.debugging.resume(context=new_tab["context"])
    paused_event = await on_paused

    # Expect to hit column 13 now
    assert paused_event["context"] == new_tab["context"]
    assert paused_event["line"] == 6
    assert paused_event["column"] == 13

    # At column 13, y should now be set to 10, z should still be undefined.
    await assert_value("y", expected_value=10)
    await assert_value("z", expected_value=None)

    await bidi_session.moz.debugging.resume(context=new_tab["context"])
    result = await eval_task
    assert result["type"] == "number"
    assert result["value"] == 420
