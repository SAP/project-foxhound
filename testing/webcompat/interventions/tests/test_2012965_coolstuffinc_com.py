import pytest

URL = "https://www.coolstuffinc.com/main_search.php?pa=searchOnName&page=1&resultsPerPage=25&q=test"
SELECT_CSS = "#mainContent select.searchMenu[name=sb]"


async def does_fastclick_activate(client):
    async with client.monitor_for_fastclick_attachment():
        await client.navigate(URL)
        # the search results don't always load properly, so try a few times.
        for _ in range(10):
            await client.navigate(URL)
            if client.find_css(SELECT_CSS):
                break
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
