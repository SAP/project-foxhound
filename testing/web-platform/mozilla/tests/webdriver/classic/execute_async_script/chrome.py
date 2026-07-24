import pytest
from support.context import using_context
from tests.classic.execute_async_script import execute_async_script
from tests.support.asserts import assert_success
from webdriver.client import WebFrame, WebWindow


@pytest.mark.parametrize(
    "expression, expected_type",
    [
        ("window.frames[0]", WebFrame),
        ("window", WebWindow),
    ],
    ids=["frame", "window"],
)
@pytest.mark.allow_system_access
def test_web_reference(
    session, expression, default_chrome_handler, new_chrome_window, expected_type
):
    chrome_url = f"{default_chrome_handler}test.xhtml"
    new_window = new_chrome_window(chrome_url)

    with using_context(session, "chrome"):
        session.window_handle = new_window.id
        assert session.url == chrome_url

        result = execute_async_script(session, f"arguments[0]({expression})")
        reference = assert_success(result)

        assert isinstance(reference, expected_type)

        if isinstance(reference, WebWindow):
            assert reference.id in session.handles
        else:
            assert reference.id not in session.handles
