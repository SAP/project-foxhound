from typing import Any

from bidi.support.debugging import Debugging


class Moz:
    def __init__(self, bidi_session: Any):
        self.debugging = Debugging(bidi_session)
