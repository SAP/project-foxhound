import pytest
from support.context import using_context
from tests.support.asserts import assert_error, assert_success

from . import switch_to_window


@pytest.mark.allow_system_access
def test_no_such_window(session):
    with using_context(session, "chrome"):
        response = switch_to_window(session, "foo")
        assert_error(response, "no such window")


@pytest.mark.allow_system_access
def test_chrome_window(session):
    session.new_window(type_hint="window")

    with using_context(session, "chrome"):
        current_handle = session.window_handle
        chrome_handles = session.handles

        chrome_handles.remove(current_handle)

        assert len(chrome_handles)

        response = switch_to_window(session, chrome_handles[0])
        assert_success(response)

        assert session.window_handle == chrome_handles[0]
        assert session.window_handle != current_handle
