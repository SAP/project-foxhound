import pytest
from tests.support.asserts import assert_dialog_handled, assert_error


def new_window(session, type_hint=None):
    return session.transport.send(
        "POST",
        "session/{session_id}/window/new".format(**vars(session)),
        {"type": type_hint},
    )


# Set "moz:debuggerAddress" to initialize WebDriver BiDi instance
# to make sure that prompts are still handled my Marionette.
@pytest.mark.capabilities({"moz:debuggerAddress": True})
@pytest.mark.parametrize(
    "dialog_type, retval",
    [
        ("alert", None),
        ("confirm", False),
        ("prompt", None),
    ],
)
def test_with_webdriver_bidi_instance(session, create_dialog, dialog_type, retval):
    original_handles = session.handles

    create_dialog(dialog_type, text="cheese")

    response = new_window(session)
    assert_error(response, "unexpected alert open", data={"text": "cheese"})

    assert_dialog_handled(session, expected_text=dialog_type, expected_retval=retval)

    assert len(session.handles) == len(original_handles)
