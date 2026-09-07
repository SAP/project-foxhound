import pytest
from tests.bidi import get_invalid_cases
from webdriver.bidi import error

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("value", get_invalid_cases("string"))
async def test_params_breakpoint_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.remove_breakpoint(breakpoint=value)


async def test_params_breakpoint_unknown_value(bidi_session):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.remove_breakpoint(
            breakpoint="unknown-breakpoint-id"
        )
