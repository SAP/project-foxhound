import pytest

URL = "https://www.public.nm.eurocontrol.int/PUBPORTAL/gateway/spec/"

COLLAPSED_CSS = ".portal_detailCollapsed"
DETAIL_CSS = "#eurocontrol_gwt_ext_stc_0"


async def detail_iframe_has_content(client):
    await client.navigate(URL, wait="none")
    client.await_css(COLLAPSED_CSS, is_displayed=True).click()
    ifr = client.find_css(DETAIL_CSS)
    assert ifr
    return client.execute_script(
        "return arguments[0].contentDocument?.body?.children.length > 0", ifr
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await detail_iframe_has_content(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await detail_iframe_has_content(client)
