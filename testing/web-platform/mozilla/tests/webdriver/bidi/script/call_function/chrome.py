import pytest
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio


@pytest.mark.allow_system_access
@pytest.mark.parametrize(
    "function_declaration, expected_value",
    [
        (
            "() => ChromeUtils.getClassName(document.defaultView)",
            {"type": "string", "value": "Window"},
        ),
        (
            "() => Ci.nsICookie.SAMESITE_STRICT",
            {"type": "number", "value": 2},
        ),
    ],
    ids=["chrome-utils", "interface"],
)
async def test_target_context(
    bidi_session, chrome_context, function_declaration, expected_value
):
    result = await bidi_session.script.call_function(
        function_declaration=function_declaration,
        await_promise=False,
        target=ContextTarget(chrome_context["context"]),
    )

    assert result == expected_value
