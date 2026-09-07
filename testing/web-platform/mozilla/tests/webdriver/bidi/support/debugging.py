from typing import Any, List, Literal, Mapping

from webdriver.bidi.modules._module import BidiModule, command
from webdriver.bidi.undefined import UNDEFINED, Maybe, Nullable


class Debugging(BidiModule):
    prefix = "moz"

    @command
    def get_script_source(self, context: str, script_url: str) -> Mapping[str, Any]:
        return {"context": context, "scriptUrl": script_url}

    @get_script_source.result
    def _get_script_source(self, result: Mapping[str, Any]) -> Any:
        assert isinstance(result["source"], str)
        return result

    @command
    def list_scripts(self, context: str) -> Mapping[str, Any]:
        return {"context": context}

    @list_scripts.result
    def _list_scripts(self, result: Mapping[str, Any]) -> Any:
        assert isinstance(result["scripts"], list)
        return result

    @command
    def remove_breakpoint(self, breakpoint: str) -> Mapping[str, Any]:
        return {"breakpoint": breakpoint}

    @command
    def resume(self, context: str) -> Mapping[str, Any]:
        return {"context": context}

    @command
    def set_breakpoint(self, location: Mapping[str, Any]) -> Mapping[str, Any]:
        return {"location": location}

    @set_breakpoint.result
    def _set_breakpoint(self, result: Mapping[str, Any]) -> Any:
        assert isinstance(result["breakpoint"], str)
        return result

    @command
    def set_debugger_enabled(
        self,
        enabled: Nullable[Literal[True]],
        contexts: Maybe[List[str]] = UNDEFINED,
        user_contexts: Maybe[List[str]] = UNDEFINED,
    ) -> Mapping[str, Any]:
        return {
            "enabled": enabled,
            "contexts": contexts,
            "userContexts": user_contexts,
        }

    @command
    def step_into(self, context: str) -> Mapping[str, Any]:
        return {"context": context}

    @command
    def step_out(self, context: str) -> Mapping[str, Any]:
        return {"context": context}

    @command
    def step_over(self, context: str) -> Mapping[str, Any]:
        return {"context": context}
