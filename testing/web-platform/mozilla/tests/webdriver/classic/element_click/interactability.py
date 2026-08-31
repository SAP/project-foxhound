import pytest
from tests.support.classic.asserts import assert_success


def element_click(session, element):
    return session.transport.send(
        "POST",
        f"session/{session.session_id}/element/{element.id}/click",
    )


@pytest.mark.capabilities({"moz:webdriverClick": False})
def test_selenium_click_inline_element_at_fractional_position(session, inline):
    # margin-top: 0.5px places the element at a fractional y-coordinate,
    # which could trigger a rounding issue preventing the click from working.
    session.url = inline("""
        <div style="margin-top: 0.5px">
          <a id="link" href="#"
             onclick="window.clicked = true">
            <div style="width: 32px; height: 32px;"></div>
          </a>
        </div>
    """)
    element = session.find.css("#link", all=False)

    response = element_click(session, element)
    assert_success(response)

    clicked = session.execute_script("return window.clicked;")
    assert clicked is True
