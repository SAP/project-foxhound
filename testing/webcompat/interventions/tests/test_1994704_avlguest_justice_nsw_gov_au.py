import pytest

URL = "https://avlguest.justice.nsw.gov.au/call/test.link"
IFRAME_CSS = "#widget-frame"
ERROR_MSG = "ReferenceError: mozRTCPeerConnection is not defined"
SUCCESS_CSS = "a.install.btn-success"
INSTALL_APP_CSS = "#installApp"


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    client.switch_to_frame(client.await_css(IFRAME_CSS))
    assert client.await_css(SUCCESS_CSS, is_displayed=True)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, await_console_message=ERROR_MSG)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_app_installation_requested_on_android(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(INSTALL_APP_CSS, is_displayed=True)
