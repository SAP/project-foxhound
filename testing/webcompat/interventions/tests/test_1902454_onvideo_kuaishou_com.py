import pytest

URL = "https://onvideo.kuaishou.com/v2/hub/home?source=cp"
HERO_CSS = "img[alt=QRcode]"
UNSUPPORTED_TEXT = "建议您升级为谷歌最新版本浏览器"
MOBILE_UNSUPPORTED_TEXT = "暂不支持移动端，请使用电脑进行体验"


async def does_warning_appear(client):
    await client.navigate(URL, wait="none")
    good, bad = client.await_first_element_of(
        [
            client.css(HERO_CSS),
            client.text(UNSUPPORTED_TEXT),
        ],
        is_displayed=True,
    )
    return bad and not good


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await does_warning_appear(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await does_warning_appear(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_mobile_still_unsupported(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(MOBILE_UNSUPPORTED_TEXT)
