import pytest

URL = "https://tutor-uksouth.classroom.cloud/"

SUPPORTED_CSS = "#classroom-sign-in-email"
UNSUPPORTED_TEXT = "not supported"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)
