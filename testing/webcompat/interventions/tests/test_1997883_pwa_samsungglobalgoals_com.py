import pytest

URL = "https://pwa.samsungglobalgoals.com/settings"

SIGN_IN_TEXT = "Sign in to use Donate with Friends"
SUPPORTED_TEXT = "Choose sign in method"
UNSUPPORTED_TEXT = "Open in browser to continue"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    client.soft_click(client.await_text(SIGN_IN_TEXT, is_displayed=True))
    assert client.await_text(SUPPORTED_TEXT, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    client.soft_click(client.await_text(SIGN_IN_TEXT, is_displayed=True))
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not client.find_text(SUPPORTED_TEXT, is_displayed=True)
