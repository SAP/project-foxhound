import pytest

URL = "https://workbench.researchallofus.org/login"

UNSUPPORTED_TEXT = "Chrome"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=False)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
