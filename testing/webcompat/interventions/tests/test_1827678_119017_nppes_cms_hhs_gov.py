import pytest

URL = "https://nppes.cms.hhs.gov/#/"

UNSUPPORTED_TEXT = "Google Chrome"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL)
    await client.stall(2)
    assert not client.find_text(UNSUPPORTED_TEXT)
