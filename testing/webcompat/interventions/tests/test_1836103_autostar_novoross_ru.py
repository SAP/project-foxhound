import pytest

URL = "https://autostar-novoross.ru/"
DEAD_SITE_TEXT = "Domain has been assigned"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(DEAD_SITE_TEXT)
