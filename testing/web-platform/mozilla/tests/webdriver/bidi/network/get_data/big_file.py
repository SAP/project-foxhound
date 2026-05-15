import pytest
from tests.support.asserts import assert_png

pytestmark = pytest.mark.asyncio


PAGE_BIG_IMAGE = "_mozilla/webdriver/bidi/network/get_data/support/big.png"


async def test_data_type_response_big_file(
    bidi_session,
    url,
    setup_collected_data,
):
    # There is no strict requirement from the spec to support payloads bigger
    # than 1MB, so this test remains mozilla-specific. It currently times out on
    # chrome.
    [request, _] = await setup_collected_data(
        fetch_url=url(PAGE_BIG_IMAGE), max_encoded_data_size=2000000
    )
    data = await bidi_session.network.get_data(request=request, data_type="response")

    assert data["type"] == "base64"
    assert isinstance(data["value"], str)
    assert_png(data["value"])
