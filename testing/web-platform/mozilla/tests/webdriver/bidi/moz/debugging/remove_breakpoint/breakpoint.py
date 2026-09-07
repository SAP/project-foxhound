import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio

from .. import PAUSED_EVENT


async def test_remove_breakpoint(
    bidi_session, new_tab, enable_debugging, inline, subscribe_events
):
    await subscribe_events([PAUSED_EVENT])

    await enable_debugging(contexts=[new_tab["context"]])

    url = inline(
        """<script>
function test() {
    const z = 1;
    return z;
}
</script>"""
    )

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url=url, wait="complete"
    )

    result = await bidi_session.moz.debugging.set_breakpoint(
        location={"url": url, "line": 6}
    )
    breakpoint_id = result["breakpoint"]

    await bidi_session.moz.debugging.remove_breakpoint(breakpoint=breakpoint_id)

    result = await bidi_session.script.evaluate(
        expression="test()",
        target=ContextTarget(new_tab["context"]),
        await_promise=False,
    )

    assert result["type"] == "number"
    assert result["value"] == 1
