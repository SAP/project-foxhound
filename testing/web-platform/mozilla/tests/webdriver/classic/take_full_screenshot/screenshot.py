import pytest
from support.helpers import get_pref
from tests.support.asserts import assert_png
from tests.support.classic.asserts import assert_error, assert_success
from tests.support.image import png_dimensions

from . import document_dimensions


def take_full_screenshot(session):
    return session.transport.send(
        "GET",
        f"/session/{session.session_id}/moz/screenshot/full",
    )


def test_no_browsing_context(session, closed_window):
    response = take_full_screenshot(session)
    assert_error(response, "no such window")


def test_html_document(session, inline):
    session.url = inline("<input>")

    response = take_full_screenshot(session)
    value = assert_success(response)
    assert_png(value)
    assert png_dimensions(value) == document_dimensions(session)


def test_xhtml_document(session, inline):
    session.url = inline('<input type="text" />', doctype="xhtml")

    response = take_full_screenshot(session)
    value = assert_success(response)
    assert_png(value)
    assert png_dimensions(value) == document_dimensions(session)


def test_document_extends_beyond_viewport(session, inline):
    session.url = inline(
        """
        <style>
        body { min-height: 200vh }
        </style>
        """
    )

    response = take_full_screenshot(session)
    value = assert_success(response)
    assert_png(value)
    assert png_dimensions(value) == document_dimensions(session)


@pytest.mark.allow_system_access
def test_huge_full_screenshot(session, inline):
    max_size = get_pref(session, "gfx.canvas.max-size")

    session.url = inline(
        f"<div style='width: {max_size}px; height: {max_size}px; background-color: black;'></div>"
    )

    response = take_full_screenshot(session)
    assert_error(response, "unsupported operation")


@pytest.mark.allow_system_access
@pytest.mark.parametrize("axis", ["width", "height"])
def test_screenshot_large_dimension(session, inline, axis):
    max_size = get_pref(session, "gfx.canvas.max-size")

    width = f"{max_size}px" if axis == "width" else "10px"
    height = f"{max_size}px" if axis == "height" else "10px"

    session.url = inline(
        f"<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
        f"<style>body {{ margin: 0; }}</style>"
        f"<div style='width: {width}; height: {height}; background-color: black;'></div>"
    )

    response = take_full_screenshot(session)
    value = assert_success(response)

    assert_png(value)
    assert png_dimensions(value) == document_dimensions(session)
