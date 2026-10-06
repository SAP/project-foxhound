import pytest

URL = "https://weaversofireland.com/kerry-tweed-flat-cap-black/"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    assert not await client.does_fastclick_activate(URL, wait="complete")
