import pytest

URL = "https://crea-tv.jp/User/ViComm/man/LoginUser.aspx?loginid=96215817&password=aaaa&bookmark=1&_tid=hUjns&sp_refresh=1"
LOGIN_CSS = "input[name=cmdSubmit]"
SUPPORTED_CSS = "#main_doc"
UNSUPPORTED_TEXT = "このページはモバイル端末専用ページです"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    client.await_css(LOGIN_CSS, is_displayed=True).click()
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    client.await_css(LOGIN_CSS, is_displayed=True).click()
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not client.find_css(SUPPORTED_CSS, is_displayed=True)
