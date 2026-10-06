import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio


@pytest.mark.allow_system_access
@pytest.mark.parametrize(
    "expression, expected_value",
    [
        (
            "ChromeUtils.getClassName(document.defaultView)",
            {"type": "string", "value": "Window"},
        ),
        (
            "Ci.nsICookie.SAMESITE_STRICT",
            {"type": "number", "value": 2},
        ),
    ],
    ids=["chrome-utils", "interface"],
)
async def test_target_context(bidi_session, chrome_context, expression, expected_value):
    result = await bidi_session.script.evaluate(
        expression=expression,
        target=ContextTarget(chrome_context["context"]),
        await_promise=False,
    )

    assert result == expected_value
