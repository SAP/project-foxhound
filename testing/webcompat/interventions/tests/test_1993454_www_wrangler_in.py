import pytest

URL = "https://www.wrangler.in/women/shirts/-blue-8905409405437"


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await client.test_aceomni_pan_and_zoom_works(URL)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await client.test_aceomni_pan_and_zoom_works(URL)
