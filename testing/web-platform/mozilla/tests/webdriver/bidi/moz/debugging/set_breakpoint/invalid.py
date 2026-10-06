import pytest
from tests.bidi import get_invalid_cases
from webdriver.bidi import error

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("value", get_invalid_cases("dict"))
async def test_params_location_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_breakpoint(location=value)


async def test_params_location_invalid_value(bidi_session):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_breakpoint(location={})


@pytest.mark.parametrize("value", get_invalid_cases("string"))
async def test_params_location_url_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_breakpoint(
            location={"url": value, "line": 1}
        )


@pytest.mark.parametrize("value", get_invalid_cases("number"))
async def test_params_location_line_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_breakpoint(
            location={"url": "https://example.com/script.js", "line": value}
        )


@pytest.mark.parametrize("value", [-1, 4.2])
async def test_params_location_line_invalid_value(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_breakpoint(
            location={"url": "https://example.com/script.js", "line": value}
        )


@pytest.mark.parametrize("value", get_invalid_cases("number"))
async def test_params_location_column_invalid_type(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_breakpoint(
            location={
                "url": "https://example.com/script.js",
                "line": 1,
                "column": value,
            }
        )


@pytest.mark.parametrize("value", [-1, 4.2])
async def test_params_location_column_invalid_value(bidi_session, value):
    with pytest.raises(error.InvalidArgumentException):
        await bidi_session.moz.debugging.set_breakpoint(
            location={
                "url": "https://example.com/script.js",
                "line": 1,
                "column": value,
            }
        )
