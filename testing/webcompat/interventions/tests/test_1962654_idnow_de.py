import asyncio

import pytest
from webdriver.error import WebDriverException

URL = "https://kyc.bonify.de/choose"
SHADOWROOT_CSS = "#usercentrics-root"
VPN_TEXT = "Access Denied"
COOKIES_CSS = "[data-testid=uc-accept-all-button]"
USERNAME_CSS = "#loginId"
PASSWORD_CSS = "#password"
LOGIN_CSS = "#login-button"
DETECT_CSS = "[data-testid=TestID_autoIdentStartCTA]"
CB_WEBCAM_CSS = "label[for=start-has-webcam]"
CB_DOCUMENTS_CSS = "label[for=start-has-documents]"
CB_AGREE_CSS = "label[for=start-has-agreed]"
PROCEED_CSS = ".btn-proceed"
TRY_DESKTOP_CSS = ".user-transfer-continue-web-desktop-experience"
SUCCESS_CSS = "#readyButton"
FAILURE_CSS = "img[src*=chrome]"


async def start_process(client, credentials):
    await client.make_preload_script("delete navigator.__proto__.webdriver")
    await client.navigate(URL, wait="none")
    shadowRoot, vpn = client.await_first_element_of(
        [
            client.css(SHADOWROOT_CSS),
            client.text(VPN_TEXT),
        ],
        is_displayed=True,
    )
    if vpn:
        pytest.skip("Region-locked, cannot test. Try using a VPN set to Germany.")
        return False

    def await_css(selector):
        return client.execute_async_script(
            """
            const [root, selector, done] = arguments;
            const i = setInterval(() => {
                const v = root.shadowRoot.querySelector(selector);
                if (v) {
                    clearInterval(i);
                    done(v);
                }
            }, 100);
          """,
            shadowRoot,
            selector,
        )

    await_css(COOKIES_CSS).click()

    async def click_when_ready(selector):
        for _ in range(5):
            elem = client.await_css(selector, is_displayed=True)
            try:
                elem.click()
                return elem
            except WebDriverException:  # element not interactable
                await asyncio.sleep(0.5)

    (await click_when_ready(USERNAME_CSS)).send_keys(credentials["username"])
    (await click_when_ready(PASSWORD_CSS)).send_keys(credentials["password"])
    await click_when_ready(LOGIN_CSS)
    await click_when_ready(DETECT_CSS)
    await click_when_ready(CB_WEBCAM_CSS)
    await click_when_ready(CB_DOCUMENTS_CSS)
    await click_when_ready(CB_AGREE_CSS)

    proceed = client.await_css(PROCEED_CSS, is_displayed=True)
    for _ in range(5):
        try:
            client.soft_click(proceed)
            await asyncio.sleep(0.5)
        except Exception as e:
            print(e)
            pass

    client.await_css(TRY_DESKTOP_CSS, is_displayed=True).click()


@pytest.mark.only_platforms("linux")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client, credentials):
    await start_process(client, credentials)
    assert client.await_css(SUCCESS_CSS, is_displayed=True)
    assert not client.find_css(FAILURE_CSS, is_displayed=True)


@pytest.mark.only_platforms("linux")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client, credentials):
    await start_process(client, credentials)
    assert client.await_css(FAILURE_CSS, is_displayed=True)
    assert not client.find_css(SUCCESS_CSS, is_displayed=True)
