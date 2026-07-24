import pytest

URL = "https://bbs.colg.cn/new"

HERO_CSS = ".home-page-right"
MOBILE_ERROR_TEXT = "Discuz! Mobile System Error"


async def check_content_is_all_onscreen(client):
    await client.navigate(URL, wait="none")
    client.await_css(HERO_CSS, is_displayed=True)
    return client.execute_script(
        "return document.scrollingElement.scrollWidth <= window.outerWidth"
    )


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await check_content_is_all_onscreen(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await check_content_is_all_onscreen(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(MOBILE_ERROR_TEXT, is_displayed=True)
