import pytest

URL = "https://portal.adtpulse.com/myhome/30.0.0-61/access/signin.jsp"
UNSUPPORTED_TEXT = "will not work properly on your operating system and browser"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    await client.stall(2)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
