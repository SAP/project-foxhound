import pytest

URL = "https://give.umrelief.org/give/480879/#!/donation/checkout"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await client.does_fastclick_activate(URL)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await client.does_fastclick_activate(URL)
