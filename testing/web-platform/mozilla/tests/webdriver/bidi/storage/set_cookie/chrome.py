import pytest
from webdriver.bidi import error
from webdriver.bidi.modules.network import NetworkStringValue
from webdriver.bidi.modules.storage import (
    BrowsingContextPartitionDescriptor,
    PartialCookie,
)

pytestmark = pytest.mark.asyncio


@pytest.mark.allow_system_access
async def test_chrome_browsing_context_not_supported(bidi_session):
    # Retrieve the chrome browsing context for the open browser window
    parent_contexts = await bidi_session.browsing_context.get_tree(
        max_depth=0, _extension_params={"moz:scope": "chrome"}
    )

    assert parent_contexts[0]["moz:scope"] == "chrome"

    partition = BrowsingContextPartitionDescriptor(parent_contexts[0]["context"])
    with pytest.raises(error.UnsupportedOperationException):
        await bidi_session.storage.set_cookie(
            cookie=PartialCookie(
                domain="example.org",
                name="foo",
                value=NetworkStringValue("bar"),
                same_site="none",
                secure=True,
            ),
            partition=partition,
        )
