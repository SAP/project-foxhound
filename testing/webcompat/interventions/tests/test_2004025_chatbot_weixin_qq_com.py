import pytest

URL = "https://chatbot.weixin.qq.com/webapp/V4poszKZgOynfZUpQvoMWtJcprqIOK?robotName="
SUPPORTED_CSS = "textarea"
UNSUPPORTED_TEXT = "浏览器不兼容"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not client.find_css(SUPPORTED_CSS, is_displayed=True)
