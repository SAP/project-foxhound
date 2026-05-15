import pytest
from webdriver.error import NoSuchElementException

URL = "https://qceservices.quezoncity.gov.ph/qcvaxeasy"

IFRAME_CSS = "iframe#qcid_iframe"
RECAPTCHA_CSS = "iframe[title*=captcha]"


async def is_iframe_visible(client, in_headless_mode):
    await client.navigate(URL)

    try:
        client.await_css(RECAPTCHA_CSS, is_displayed=True, timeout=5)
        if in_headless_mode:
            pytest.xfail("Skipping as cannot do reCAPTCHA in headless mode.")
            return False
        try:
            print("\a")
            iframe = client.await_css(IFRAME_CSS, is_displayed=True, timeout=120)
        except NoSuchElementException:
            pytest.xfail(
                "Timed out waiting for reCAPTCHA to be completed. Please try again."
            )
            return False
    except NoSuchElementException:
        iframe = client.await_css(IFRAME_CSS, is_displayed=True)
        pass

    assert iframe
    return client.execute_script(
        """
        return arguments[0].getBoundingClientRect().height > 200;
    """,
        iframe,
    )


@pytest.mark.only_firefox_versions(min=146)
@pytest.mark.enable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_now_works_with_just_pref(client, in_headless_mode):
    assert await is_iframe_visible(client, in_headless_mode)


@pytest.mark.only_firefox_versions(min=146)
@pytest.mark.disable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_still_works_without_pref(client, in_headless_mode):
    assert await is_iframe_visible(client, in_headless_mode)


@pytest.mark.only_firefox_versions(min=146)
@pytest.mark.disable_webkit_fill_available
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_still_does_not_work_without_pref_or_intervention(
    client, in_headless_mode
):
    assert not await is_iframe_visible(client, in_headless_mode)


@pytest.mark.only_firefox_versions(max=145)
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_did_work_with_intervention(client, in_headless_mode):
    assert await is_iframe_visible(client, in_headless_mode)


@pytest.mark.only_firefox_versions(max=145)
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_did_not_work_without_intervention(client, in_headless_mode):
    assert not await is_iframe_visible(client, in_headless_mode)
