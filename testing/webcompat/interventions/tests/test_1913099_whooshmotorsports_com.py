import pytest

URL = "https://whooshmotorsports.com/collections/2013-ford-focus-st/products/copy-of-whoosh-motorsports-performance-coil-packs-2014-2019-focus-st-2-0l"


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
