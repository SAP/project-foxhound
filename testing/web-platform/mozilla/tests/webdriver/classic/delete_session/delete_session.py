import pytest
from tests.support.classic.asserts import assert_success

pytestmark = pytest.mark.asyncio


DOWNLOAD_WILL_BEGIN = "browsingContext.downloadWillBegin"


def delete_session(session):
    return session.transport.send(
        "DELETE", "session/{session_id}".format(**vars(session))
    )


async def test_with_pending_download(
    bidi_session,
    current_session,
    inline,
    wait_for_event,
    wait_for_future_safe,
):
    current_session.url = inline(
        """<a id="download_link" href="/_mozilla/webdriver/support/assets/big.png" download>download</a>"""
    )

    await bidi_session.session.subscribe(events=[DOWNLOAD_WILL_BEGIN])

    on_download_will_begin_future = wait_for_event(DOWNLOAD_WILL_BEGIN)

    current_session.find.css("#download_link", all=False).click()

    await wait_for_future_safe(on_download_will_begin_future)

    response = delete_session(current_session)
    assert_success(response)

    # Need an explicit call to session.end() to notify the test harness
    # that a new session needs to be created for subsequent tests.
    current_session.end()
