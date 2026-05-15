import pytest
from tests.bidi import wait_for_bidi_events
from tests.bidi.network import (
    BEFORE_REQUEST_SENT_EVENT,
    IMAGE_RESPONSE_BODY,
    RESPONSE_COMPLETED_EVENT,
    RESPONSE_STARTED_EVENT,
    STYLESHEET_RED_COLOR,
    assert_before_request_sent_event,
    assert_response_event,
    get_cached_url,
    get_next_event_for_url,
)


@pytest.mark.asyncio
async def test_data_uri(
    bidi_session,
    add_intercept,
    top_context,
    setup_network_test,
    wait_for_event,
    wait_for_future_safe,
    fetch,
):
    await setup_network_test(
        events=[
            BEFORE_REQUEST_SENT_EVENT,
            RESPONSE_COMPLETED_EVENT,
            RESPONSE_STARTED_EVENT,
        ]
    )

    # Add a context intercept, with no pattern.
    data_url = "data:text/plain,1"
    await add_intercept(
        contexts=[top_context["context"]],
        phases=["beforeRequestSent", "responseStarted"],
        url_patterns=[],
    )

    on_before_request_sent = wait_for_event(BEFORE_REQUEST_SENT_EVENT)
    on_response_completed = wait_for_event(RESPONSE_COMPLETED_EVENT)
    on_response_started = wait_for_event(RESPONSE_STARTED_EVENT)

    # data URIs cannot be intercepted. The request should succeed and the events
    # should not have the isBlocked flag.
    await fetch(data_url, method="GET")

    before_request_sent_event = await wait_for_future_safe(on_before_request_sent)
    response_started_event = await wait_for_future_safe(on_response_started)
    response_completed_event = await wait_for_future_safe(on_response_completed)

    # Checked the events have the expected isBlocked flag set to false.
    assert_before_request_sent_event(
        before_request_sent_event,
        expected_event={"isBlocked": False, "request": {"url": data_url}},
    )
    assert_response_event(
        response_started_event,
        expected_event={
            "isBlocked": False,
            "request": {"url": data_url},
            "response": {"url": data_url},
        },
    )
    assert_response_event(
        response_completed_event,
        expected_event={
            "isBlocked": False,
            "request": {"url": data_url},
            "response": {"url": data_url},
        },
    )


@pytest.mark.asyncio
async def test_cached_resources(
    bidi_session,
    add_intercept,
    top_context,
    url,
    inline,
    setup_network_test,
    wait_for_event,
    wait_for_future_safe,
    fetch,
):
    network_events = await setup_network_test(
        events=[
            BEFORE_REQUEST_SENT_EVENT,
            RESPONSE_COMPLETED_EVENT,
            RESPONSE_STARTED_EVENT,
        ]
    )

    cached_image_url = url(get_cached_url("img/png", IMAGE_RESPONSE_BODY))
    cached_link_css_url = url(get_cached_url("text/css", STYLESHEET_RED_COLOR))
    page_with_cached_css = inline(
        f"""
        <head><link rel="stylesheet" type="text/css" href="{cached_link_css_url}"></head>
        <body>test page with cached stylesheet and image <img src="{cached_image_url}"></body>
        """,
    )

    await bidi_session.browsing_context.navigate(
        context=top_context["context"],
        url=page_with_cached_css,
        wait="complete",
    )

    # Expect two events, one for the document, one for the stylesheet.
    await wait_for_bidi_events(
        bidi_session, network_events[RESPONSE_COMPLETED_EVENT], 3, timeout=2
    )

    # Add an intercept for the cached stylesheet and image.
    await add_intercept(
        contexts=[top_context["context"]],
        phases=["beforeRequestSent", "responseStarted"],
        url_patterns=[
            {"type": "string", "pattern": cached_image_url},
            {"type": "string", "pattern": cached_link_css_url},
        ],
    )

    # Reload the page.
    await bidi_session.browsing_context.reload(
        context=top_context["context"], wait="complete"
    )

    # Expect two events after reload, for the document and the stylesheet.
    await wait_for_bidi_events(
        bidi_session, network_events[RESPONSE_COMPLETED_EVENT], 6, timeout=2
    )

    # Assert only cached events after reload.
    beforerequestsent_events = network_events[BEFORE_REQUEST_SENT_EVENT][3:]
    responsestarted_events = network_events[RESPONSE_STARTED_EVENT][3:]
    responsecompleted_events = network_events[RESPONSE_COMPLETED_EVENT][3:]

    # Checked the events for the image and the stylesheet have the expected
    # isBlocked flag set to false.
    assert_before_request_sent_event(
        get_next_event_for_url(beforerequestsent_events, cached_link_css_url),
        expected_event={"isBlocked": False},
    )
    assert_before_request_sent_event(
        get_next_event_for_url(beforerequestsent_events, cached_image_url),
        expected_event={"isBlocked": False},
    )
    assert_response_event(
        get_next_event_for_url(responsestarted_events, cached_link_css_url),
        expected_event={"isBlocked": False},
    )
    assert_response_event(
        get_next_event_for_url(responsestarted_events, cached_image_url),
        expected_event={"isBlocked": False},
    )
    assert_response_event(
        get_next_event_for_url(responsecompleted_events, cached_link_css_url),
        expected_event={"isBlocked": False},
    )
    assert_response_event(
        get_next_event_for_url(responsecompleted_events, cached_image_url),
        expected_event={"isBlocked": False},
    )
