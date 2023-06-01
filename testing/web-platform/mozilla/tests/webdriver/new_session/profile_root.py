import copy
import os

import pytest


def test_profile_root(tmp_path, configuration, geckodriver):
    profile_path = os.path.join(tmp_path, "geckodriver-test")
    os.makedirs(profile_path)

    config = copy.deepcopy(configuration)
    # Ensure we don't set a profile in command line arguments
    del config["capabilities"]["moz:firefoxOptions"]["args"]

    extra_args = ["--profile-root", profile_path]

    assert os.listdir(profile_path) == []

    driver = geckodriver(config=config, extra_args=extra_args)
    driver.new_session()
    assert len(os.listdir(profile_path)) == 1
    driver.delete_session()
    assert os.listdir(profile_path) == []


def test_profile_root_missing(tmp_path, configuration, geckodriver):
    profile_path = os.path.join(tmp_path, "missing-path")

    config = copy.deepcopy(configuration)
    # Ensure we don't set a profile in command line arguments
    del config["capabilities"]["moz:firefoxOptions"]["args"]

    extra_args = ["--profile-root", profile_path]

    with pytest.raises(Exception):
        geckodriver(config=config, extra_args=extra_args)
