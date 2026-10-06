import pytest
from webdriver.error import UnexpectedAlertOpenException

URL = "https://xmgl.ccccltd.cn/a/login"

UNSUPPORTED_TEXT = "请使用基于Chrome内核52版本以上的浏览器访问本系统"
LOGIN_CSS = "#login_form2"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(LOGIN_CSS, is_displayed=True, timeout=60)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    try:
        await client.navigate(URL, wait="none")
        assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True, timeout=60)
        assert not client.find_css(LOGIN_CSS, is_displayed=True)
    except UnexpectedAlertOpenException:
        assert True
