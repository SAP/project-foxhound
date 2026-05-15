import pytest
from webdriver.error import StaleElementReferenceException

URL = "https://www.xtralife.com/"

HERO_CSS = ".cookie-title"
SEARCH_CSS = "form[action*=buscar] input[type=text]"
SEARCH_RESULTS_CSS = ".smart-search-results"
HEADER_CSS = ".headerContent"


async def search_results_positioned_properly(client):
    await client.navigate(URL, wait="none")
    client.await_css(HERO_CSS, is_displayed=True)
    for _ in range(4):
        try:
            client.await_css(SEARCH_CSS, is_displayed=True).send_keys("test")
            break
        except StaleElementReferenceException:
            pass
    results = client.await_css(SEARCH_RESULTS_CSS, is_displayed=True)
    header = client.await_css(HEADER_CSS, is_displayed=True)
    return client.execute_script(
        """
        const [results, header] = arguments;
        const headerBB = header.getBoundingClientRect();
        const resultsBB = results.getBoundingClientRect();
        return resultsBB.top >= headerBB.bottom;
      """,
        results,
        header,
    )


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await search_results_positioned_properly(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await search_results_positioned_properly(client)
