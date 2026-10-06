import pytest

URL = "https://www.dockers.in/men/shirt/relaxed-green-8905409633083"


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
