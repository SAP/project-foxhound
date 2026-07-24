import pytest
import pytest_asyncio
from tests.bidi.network import (
    BEFORE_REQUEST_SENT_EVENT,
    PAGE_EMPTY_HTML,
    RESPONSE_COMPLETED_EVENT,
)
from webdriver.bidi import error

MAX_TOTAL_SIZE = 1000

# Prepare various data sizes to test against a max total size of 1000
big_data = MAX_TOTAL_SIZE - 100
half_size_data = int(MAX_TOTAL_SIZE / 2)
max_size_data = MAX_TOTAL_SIZE
small_data = int(MAX_TOTAL_SIZE / 100)
too_big_data = MAX_TOTAL_SIZE + 100
too_big_one_byte_data = MAX_TOTAL_SIZE + 1


@pytest_asyncio.fixture
async def send_request(wait_for_event, inline, fetch, wait_for_future_safe):
    # This flag is dedicated to support the "request or response" mode.
    mode_flip = False

    async def _send_request(size, mode):
        nonlocal mode_flip

        # In request or response mode, alternate between request and response
        # for every request.
        if mode == "request or response":
            mode_flip = not mode_flip
            data_type = "request" if mode_flip else "response"
        else:
            data_type = mode

        data = "".join("A" for i in range(size))
        if data_type == "request":
            post_data = data
            response_data = ""
        elif data_type == "response":
            response_data = data
            post_data = None

        on_response_completed = wait_for_event(RESPONSE_COMPLETED_EVENT)
        # Note: We use the "js" doctype here to avoid any boilerplate in the inline
        # response, which would inflate the sizes unexpectedly.
        await fetch(url=inline(response_data, doctype="js"), post_data=post_data)
        event = await wait_for_future_safe(on_response_completed)

        # Return both the request id and the actual data_type where the data was
        # set.
        return {"request": event["request"]["request"], "data_type": data_type}

    return _send_request


@pytest.mark.capabilities({
    "moz:firefoxOptions": {
        "prefs": {
            "remote.network.maxTotalDataSize": MAX_TOTAL_SIZE,
        },
    },
})
@pytest.mark.parametrize(
    "mode",
    [
        "request",
        "response",
        "request or response",
    ],
)
@pytest.mark.asyncio
async def test_max_total_data_size(
    bidi_session,
    setup_network_test,
    top_context,
    add_data_collector,
    send_request,
    mode,
):
    await setup_network_test(
        events=[
            BEFORE_REQUEST_SENT_EVENT,
            RESPONSE_COMPLETED_EVENT,
        ]
    )

    await bidi_session.browsing_context.navigate(
        context=top_context["context"],
        url=PAGE_EMPTY_HTML,
        wait="complete",
    )

    # Add a collector, with the same max size as the total size.
    await add_data_collector(
        collector_type="blob",
        data_types=["request", "response"],
        max_encoded_data_size=MAX_TOTAL_SIZE,
    )

    # Send a request to store the 900 chars (uncompressed) response.
    request_1_big = await send_request(size=big_data, mode=mode)

    await assert_request_data_available(request_1_big, bidi_session)

    # Send another big request.
    # Check a previous request is evicted if more space is needed.
    request_2_big = await send_request(size=big_data, mode=mode)

    # Expected: 1->evicted, 2->OK
    await assert_request_data_unavailable(request_1_big, bidi_session)
    await assert_request_data_available(request_2_big, bidi_session)

    # Send a small request for a 10 chars response.
    # Check eviction only done if more space is required.
    request_3_small = await send_request(size=small_data, mode=mode)

    # Expected: 2->OK, 3->OK
    await assert_request_data_available(request_2_big, bidi_session)
    await assert_request_data_available(request_3_small, bidi_session)

    # Send another big request.
    # Check eviction only removes requests as needed (preserves small request if
    # enough space is available).
    request_4_big = await send_request(size=big_data, mode=mode)

    # Expected: 2->evicted, 3->OK, 4->OK
    await assert_request_data_unavailable(request_2_big, bidi_session)
    await assert_request_data_available(request_3_small, bidi_session)
    await assert_request_data_available(request_4_big, bidi_session)

    # Send another small request.
    # This is a preparatory step for the next check.
    request_5_small = await send_request(size=small_data, mode=mode)

    # Expected: 3->OK, 4->OK, 5->OK
    await assert_request_data_available(request_3_small, bidi_session)
    await assert_request_data_available(request_4_big, bidi_session)
    await assert_request_data_available(request_5_small, bidi_session)

    # Send another big request.
    # Check eviction follows first-in, first-out, the 3rd small request will be
    # evicted because it arrived before the 4th big request (which is
    # mandatory to delete to store the new one).
    # But the 5th small request should still be available.
    request_6_big = await send_request(size=big_data, mode=mode)

    # Expected: 3->evicted, 4->evicted, 5->OK, 6->OK
    await assert_request_data_unavailable(request_3_small, bidi_session)
    await assert_request_data_unavailable(request_4_big, bidi_session)
    await assert_request_data_available(request_5_small, bidi_session)
    await assert_request_data_available(request_6_big, bidi_session)

    # Send a request which is too big for the collector.
    # No other request should be evicted in this case, 5th and 6th requests
    # should still be available.
    request_7_too_big = await send_request(size=too_big_data, mode=mode)

    # Expected: 5->OK, 6->OK, 7->no such data
    await assert_request_data_available(request_5_small, bidi_session)
    await assert_request_data_available(request_6_big, bidi_session)
    # Request 7 was not stored at all, and a different error is emitted in this
    # case.
    with pytest.raises(error.NoSuchNetworkDataException):
        await bidi_session.network.get_data(
            request=request_7_too_big["request"],
            data_type=request_7_too_big["data_type"],
        )

    # Send a request which is too big by just one byte.
    request_8_too_big_one_byte = await send_request(
        size=too_big_one_byte_data, mode=mode
    )

    # Expected: 5->OK, 6->OK, 8->no such data
    await assert_request_data_available(request_5_small, bidi_session)
    await assert_request_data_available(request_6_big, bidi_session)
    # Request 8 was not stored at all, and a different error is emitted in this
    # case.
    with pytest.raises(error.NoSuchNetworkDataException):
        await bidi_session.network.get_data(
            request=request_8_too_big_one_byte["request"],
            data_type=request_8_too_big_one_byte["data_type"],
        )

    # Send a request which is exactly the max size.
    request_9_max_size = await send_request(size=max_size_data, mode=mode)

    # Expected: 5->evicted, 6->evicted, 9->OK
    await assert_request_data_unavailable(request_5_small, bidi_session)
    await assert_request_data_unavailable(request_6_big, bidi_session)
    await assert_request_data_available(request_9_max_size, bidi_session)

    # Send two requests which add up to the max size.
    request_10_half_size = await send_request(size=half_size_data, mode=mode)
    request_11_half_size = await send_request(size=half_size_data, mode=mode)

    # Expected: 9->evicted, 10->OK, 11->OK
    await assert_request_data_unavailable(request_9_max_size, bidi_session)
    await assert_request_data_available(request_10_half_size, bidi_session)
    await assert_request_data_available(request_11_half_size, bidi_session)


async def assert_request_data_available(request, bidi_session):
    data = await bidi_session.network.get_data(
        request=request["request"],
        data_type=request["data_type"],
    )
    assert isinstance(data["value"], str)


async def assert_request_data_unavailable(request, bidi_session):
    with pytest.raises(error.UnavailableNetworkDataException):
        await bidi_session.network.get_data(
            request=request["request"],
            data_type=request["data_type"],
        )
