import pytest

URL = "https://demo.museumofpragueai.com/chatbot/"
LANG_OVERLAY_CSS = "#langOverlay"
FIRST_FLAG_CSS = ".lang-option.emoji"
MIC_CSS = "#micBtn"
MISSING_API_TEXT = "SpeechRecognition API not supported"


async def can_click_on_flags(client):
    await client.navigate(URL)
    overlay = client.await_css(LANG_OVERLAY_CSS, is_displayed=True)
    client.await_css(FIRST_FLAG_CSS, is_displayed=True).click()
    client.await_element_hidden(client.css(LANG_OVERLAY_CSS), timeout=5)
    return not client.is_displayed(overlay)


@pytest.mark.disable_speechrecognition
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await can_click_on_flags(client)
    # also check that the mic button is hidden
    assert client.await_css(MIC_CSS, is_displayed=False)


@pytest.mark.disable_speechrecognition
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await can_click_on_flags(client)
    # also check that the mic button is hidden
    assert client.await_css(MIC_CSS, is_displayed=True)
    client.await_text(MISSING_API_TEXT, is_displayed=True)


@pytest.mark.enable_speechrecognition
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_works_with_pref_on(client):
    assert await can_click_on_flags(client)
    # also check that the mic button is NOT hidden
    assert client.await_css(MIC_CSS, is_displayed=True)
