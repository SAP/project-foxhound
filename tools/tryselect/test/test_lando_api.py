from textwrap import dedent
from typing import Optional
from unittest import mock

import mozunit
import pytest
from tryselect.lando import LandoAPI


@mock.patch("tryselect.lando.Auth0Config")
@pytest.mark.parametrize(
    "section,expected_instance_id",
    (
        ("no_id", "no_id"),
        ("id", "id_present"),
        ("missing", None),
    ),
)
def test_lando_api_from_lando_config_file(
    auth0_config: mock.Mock, section: str, expected_instance_id: Optional[str]
):
    mock_config_path = mock.MagicMock()
    mock_config_path.exists.return_value = True
    mock_config_path.read_text.return_value = dedent("""
       [no_id]
       api_domain = no_id.lando.example.net
       # Lando production Auth0 configuration.
       auth0_domain = auth.example.net
       auth0_client_id = xXxX
       auth0_audience = https://no_id.lando.example.net
       auth0_scope = openid email profile lando https://sso.mozilla.com/claim/groups
       [id]
       instance_id = id_present
       api_domain = id.lando.example.net
       # Lando production Auth0 configuration.
       auth0_domain = auth.example.net
       auth0_client_id = XxXx
       auth0_audience = https://id.lando.example.net
       auth0_scope = openid email profile lando https://sso.mozilla.com/claim/groups
       """)

    if expected_instance_id is None:
        with pytest.raises(
            ValueError, match=f"Lando config file does not have a {section} section."
        ):
            lando_api = LandoAPI.from_lando_config_file(mock_config_path, section)
    else:
        lando_api = LandoAPI.from_lando_config_file(mock_config_path, section)
        assert lando_api.instance_id == expected_instance_id, (
            "Unexpected LandoApi instance_id"
        )


if __name__ == "__main__":
    mozunit.main()
