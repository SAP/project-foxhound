# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import logging
from functools import cache
from pathlib import Path

from taskgraph.optimize.base import OptimizationStrategy, register_strategy
from taskgraph.util.yaml import load_yaml

from gecko_taskgraph import GECKO

logger = logging.getLogger(__name__)


@register_strategy("skip-unless-sphinx-js")
class SkipUnlessSphinxJs(OptimizationStrategy):
    """
    Optimization strategy for tasks using Sphinx JS.

    This strategy checks if any changed files match the js_source_paths
    configured in docs/config.yml.
    """

    @classmethod
    @cache
    def _get_js_source_paths(cls):
        doc_config_file = Path(GECKO) / "docs" / "config.yml"

        try:
            return load_yaml(doc_config_file)["js_source_paths"]
        except Exception as e:
            logger.warning(f"Failed to load docs/config.yml: {e}")
            return []

    def should_remove_task(self, task, params, _):
        files_changed = params.get("files_changed", [])
        if not files_changed:
            return True

        js_source_paths = self._get_js_source_paths()
        if not js_source_paths:
            return True

        for file_path in files_changed:
            for js_path in js_source_paths:
                if file_path.startswith(js_path):
                    return False
        return True
