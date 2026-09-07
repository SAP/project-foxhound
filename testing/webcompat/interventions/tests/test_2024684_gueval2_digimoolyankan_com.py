import pytest

URL = "https://gueval2.digimoolyankan.com/"
UNSUPPORTED_TEXT = "Unsupported browser detected"
SUPPORTED_TEXT = "Login Access"


async def visit_site(client):
    await client.navigate(URL, wait="none")


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await visit_site(client)
    assert client.await_text(SUPPORTED_TEXT, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await visit_site(client)
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not client.find_text(SUPPORTED_TEXT, is_displayed=True)
