import pytest
from webdriver import NoSuchElementException

URL = "https://app.powerbi.com/view?r=eyJrIjoiN2U3NGMyNWEtZTAxNS00MzVhLWExNmMtOThhZjdiYjQ4MWNkIiwidCI6IjEyNGU2OWRiLWVmNjUtNDk2Yi05NmE5LTVkNTZiZWMxZDI5MSIsImMiOjl9"

HERO_CSS = "visual-modern"
SCROLLBAR_CSS = ".scroll-element"
SCROLL_CONTAINER_CSS = ".scrollbar-inner.scroll-content"


async def is_scrollbar_added(client):
    await client.navigate(URL)
    client.await_css(HERO_CSS, is_displayed=True)
    try:
        assert client.await_css(SCROLLBAR_CSS, timeout=3)
    except NoSuchElementException:
        return False

    container = client.await_css(SCROLL_CONTAINER_CSS)
    return client.execute_script(
        """return arguments[0].clientWidth == arguments[0].parentNode.clientWidth""",
        container,
    )


@pytest.mark.only_platforms("mac")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await is_scrollbar_added(client)


@pytest.mark.only_platforms("mac")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await is_scrollbar_added(client)
