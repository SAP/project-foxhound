import pytest

URL = "https://rutamayacoffee.com/products/medium-roast"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    assert not await client.does_fastclick_activate(URL)
