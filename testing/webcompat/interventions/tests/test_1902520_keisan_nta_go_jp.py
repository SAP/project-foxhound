import pytest

URL = "https://www.keisan.nta.go.jp/kyoutu/ky/sm/top_web#bsctrl"
CARD_YES_CSS = "#card_yes + label"
PHONE_AND_READER_YES_CSS = "#phoneAndReader_yes + label"
SUBMIT_CSS = "[onclick*=doSubmit][onclick*=csw0100_myno_qr]"
NOTICE_CSS = "[onclick*=openExternalSubGuidance][onclick*=recommend]"
PROGRESS_CSS = "form[action*=cmw0900] .yeartitle.tounen"


async def is_blocked(client):
    await client.navigate(URL)
    client.await_css(CARD_YES_CSS, is_displayed=True).click()
    client.await_css(PHONE_AND_READER_YES_CSS, is_displayed=True).click()
    client.await_css(SUBMIT_CSS, is_displayed=True).click()
    bad, good = client.await_first_element_of(
        [
            client.css(NOTICE_CSS),
            client.css(PROGRESS_CSS),
        ],
        is_displayed=True,
    )
    return bad is not None


@pytest.mark.only_platforms("mac", "windows")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await is_blocked(client)


@pytest.mark.only_platforms("mac", "windows")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await is_blocked(client)
