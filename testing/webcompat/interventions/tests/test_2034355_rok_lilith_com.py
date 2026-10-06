import pytest

URL = "https://rok.lilith.com/"


async def does_page_appear_on_load(client):
    await client.navigate(URL, wait="load")
    await client.stall(1)
    return client.execute_script("return document.body.clientHeight > 0")


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await does_page_appear_on_load(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await does_page_appear_on_load(client)
