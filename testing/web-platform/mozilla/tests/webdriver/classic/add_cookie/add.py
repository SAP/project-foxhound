import pytest
from tests.support.asserts import assert_error


@pytest.fixture(autouse=True)
def clean_up_cookies(session):
    # Ensure that any test in the file does not navigate away once done with checking the cookies.
    session.transport.send("DELETE", "session/%s/cookie" % session.session_id)


def add_cookie(session, cookie):
    return session.transport.send(
        "POST",
        "session/{session_id}/cookie".format(**vars(session)),
        {"cookie": cookie},
    )


def test_invalid_samesite_none_and_not_secure(session, url):
    session.url = url("/common/blank.html")

    name = "foo"
    value = "bar"

    session.execute_script(f"document.cookie='{name}={value}'")
    cookie = session.cookies(name)

    # Set a cookie with exactly the same values as they are set with `document.cookie`.
    result = add_cookie(
        session,
        {
            "name": "foo2",
            "value": cookie["value"],
            "sameSite": cookie["sameSite"],
            "secure": cookie["secure"],
            "httpOnly": cookie["httpOnly"],
        },
    )
    assert_error(result, "unable to set cookie")
