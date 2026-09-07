import pytest

URL = "https://app.bchydro.com/sap/bc/webdynpro/sap/hrrcf_a_unreg_job_search?sap-wd-configId=ZHRRCF_A_UNREG_JOB_SEARCH&sap-theme=sap_belize&saml2=disabled#"
SUPPORTED_CSS = "#WD48"
UNSUPPORTED_TEXT = "browser is not supported"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not client.find_css(SUPPORTED_CSS, is_displayed=True)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_desktop_still_works(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)
