import pytest

URL = "https://teikiyoyaku.tokyu.co.jp/trw/input?kbn=1&languageCode=ja"
UNAVAILABLE_TEXT = "Service unavailable"


async def does_fastclick_activate(client):
    async with client.monitor_for_fastclick_attachment():
        await client.navigate(URL, wait="load")

        # The service is down overnight, making it harder to test in other time zones.
        if client.find_text(UNAVAILABLE_TEXT, is_displayed=True):
            pytest.skip("Site is down during night-time in Japan")
            return

        return await client.was_fastclick_attached()


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await does_fastclick_activate(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await does_fastclick_activate(client)
