import pytest

URL = "https://www.directv.com.co/"
IFRAME_CSS = "#main-iframe"
INCOMPATIBLE_CSS = ".browser-compatible.compatible.incompatible"
BLOCKED_TEXT = "blocked by the security rules"
DENIED_TEXT = "not available in your region"


async def check_unsupported_visibility(client, should_show):
    await client.navigate(URL)

    # their region-block page sometimes wraps the content in an iframe
    frame = client.find_css(IFRAME_CSS)
    if frame:
        client.switch_frame(frame)

    denied, blocked, incompatible = client.await_first_element_of(
        [
            client.text(DENIED_TEXT),
            client.text(BLOCKED_TEXT),
            client.css(INCOMPATIBLE_CSS),
        ]
    )

    if denied or blocked:
        pytest.skip("Region-locked, cannot test. Try using a VPN set to USA.")
        return

    shown = client.is_displayed(incompatible)
    assert (should_show and shown) or (not should_show and not shown)


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await check_unsupported_visibility(client, should_show=False)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await check_unsupported_visibility(client, should_show=True)
