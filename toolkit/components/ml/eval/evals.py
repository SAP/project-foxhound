# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
from abc import ABC, abstractmethod
from typing import Any, Callable


class _Evaluation(ABC):
    """
    The abstract base class for an evaluation that is run by mozperftest.
    See python/mozperftest/mozperftest/metrics/eval.py
    """

    # Include a list of requirements that will be pip installed via the test harness.
    # Requirements should not require a build, and should have the appropriate .whl
    # files for reproducibility.
    requirements: list[str] = []

    def __init__(self, log: Callable[[str], None], config: dict[str, Any]) -> None:
        self.log = log
        self.config = config

    @abstractmethod
    def run(self, payloads: list[dict[str, Any]]) -> dict:
        """Run the evaluation and return a perftest metric result."""
        ...


class _LlmJudge(_Evaluation):
    """
    Use the Mozilla LLM Proxy Auth (MLPA) endpoint to run an LLM as a judge.
    """

    requirements = [
        "openai>=2.7.1",
    ]

    def __init__(self, log: Callable[[str], None], config: dict[str, Any]) -> None:
        super().__init__(log, config)
        self.mlpa_url = "https://mlpa-nonprod-stage-mozilla.global.ssl.fastly.net"
        self.model = config.get("model", "vertex_ai/mistral-small-2503")
        self.fxa_token = os.environ.get("MOZ_FXA_BEARER_TOKEN")
        self.mlpa_token = os.environ.get("MOZ_MLPA_AUTHORIZATION_TOKEN")

    def query_llm(
        self,
        model: str,
        messages: list[dict[str, str]],
        response_format: dict[str, Any],
    ):
        from openai import OpenAI

        # check for tokens
        if not self.fxa_token:
            raise RuntimeError("Missing MOZ_FXA_BEARER_TOKEN for LLM evaluation.")
        if not self.mlpa_token:
            raise RuntimeError(
                "Missing MOZ_MLPA_AUTHORIZATION_TOKEN for LLM evaluation."
            )

        # generate client
        client = OpenAI(
            api_key="unused",
            base_url=f"{self.mlpa_url}/v1",
            default_headers={
                "Authorization": f"Bearer {self.fxa_token}",
                "X-Dev-Authorization": self.mlpa_token,
                "Service-Type": "mochi-dev",
            },
        )

        # construct appropriate payload
        payload = {
            "model": model.lower(),
            "messages": messages,
            "stream": False,
            "response_format": response_format,
        }

        # make the request
        try:
            result = client.chat.completions.create(**payload)

        except Exception as e:
            raise RuntimeError(f"LLM query failed: {e}")
        finally:
            # close
            client.close()

        # parse the response
        try:
            content = result.choices[0].message.content
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Failed to parse LLM response as JSON: {content}"
            ) from exc


class _TranslationsSacreBleu(_Evaluation):
    """
    Compute the bleu or chrF (character level f-score) for a translation.
    https://en.wikipedia.org/wiki/BLEU
    https://en.wikipedia.org/wiki/F-score

    Use TranslationsBleu and TranslationsChrf for the respective scores.
    """

    requirements = [
        "sacrebleu==2.4.2",
    ]

    name = ""

    def compute_score(self, trg: str, ref: str) -> float:
        raise NotImplementedError()

    def run(self, payloads: list[dict[str, Any]]) -> dict:
        results: list[float] = []
        for payload in payloads:
            if "trg" not in payload or "ref" not in payload:
                raise ValueError(f"Missing required translation fields in {payload}")
            trg = payload["trg"]
            ref = payload["ref"]

            results.append(self.compute_score(trg, ref))

        if not results:
            raise ValueError(
                "No evaluation results were produced for translation data."
            )

        return {
            "name": self.name,
            "values": results,
            "lowerIsBetter": True,
        }


class TranslationsBleu(_TranslationsSacreBleu):
    """See _TranslationsSacreBleu for documentation."""

    name = "bleu"

    def compute_score(self, trg: str, ref: str) -> float:
        import sacrebleu

        self.log("Computing the bleu score")
        return sacrebleu.corpus_bleu([trg], [[ref]]).score


class TranslationsChrf(_TranslationsSacreBleu):
    """See _TranslationsSacreBleu for documentation."""

    name = "chrF"

    def compute_score(self, trg: str, ref: str) -> float:
        import sacrebleu

        self.log("Computing the chrF score")
        return sacrebleu.corpus_chrf([trg], [[ref]]).score


class LlmJudge(_LlmJudge):
    """
    A generic LLM judge that can be used for various evaluation tasks.
    See TranslationsLlmJudge for an example of a specific implementation.
    """

    def run(self, payloads: list[dict[str, Any]]) -> dict:
        # This base implementation just returns the raw LLM response content for each payload.
        # Subclasses can implement specific prompting and parsing logic as needed.
        results = {}
        eval_config = {}
        for payload in payloads:
            # Per-payload evalConfig takes precedence over the top-level eval_config.
            eval_config = payload.get("eval_config", {})
            messages = payload.get("messages")
            if not messages:
                raise ValueError(f"Missing 'messages' field in payload: {payload}")
            response_format = payload.get("response_format")
            if not response_format:
                raise ValueError(
                    f"Missing 'response_format' field in payload: {payload}"
                )
            model = payload.get("model", self.model)
            response = self.query_llm(
                model=model,
                messages=messages,
                response_format=response_format,
            )
            errors = []
            for key, value in response.items():
                key_config = eval_config.get(key, {})
                threshold_min = key_config.get("thresholdMin", None)
                if (
                    threshold_min is not None
                    and isinstance(value, (int, float))
                    and value < threshold_min
                ):
                    errors.append(
                        f"Value for '{key}' is below the minimum threshold of {threshold_min}: {value}"
                    )
                results.setdefault(key, []).append(value)
            if errors:
                raise AssertionError(
                    "LLM judge evaluation failed:\n"
                    + "\n".join(errors)
                    + f"\nJudge Model: {model}\nMessages: {messages}\n\nFull LLM response: {response}"
                )

        if not results:
            raise ValueError("No evaluation results were produced for LLM judge data.")

        # verify that numeric results meet any specified thresholds and determine if any alerts should be raised
        for key, values in results.items():
            key_config = eval_config.get(key, {})
            threshold_min = key_config.get("thresholdMin", None)
            if threshold_min is not None:
                for value in values:
                    if not isinstance(value, (int, float)):
                        raise ValueError(
                            f"LLM judge result for key '{key}' is not numeric: {value}"
                        )
                    if value < threshold_min:
                        raise AssertionError(
                            f"LLM judge result for '{key}' is below the minimum threshold of {threshold_min}: {value}. "
                        )

        # construct return values for perfherder
        return_results = []
        for key, values in results.items():
            if isinstance(values[0], (int, float)):
                return_results.append({
                    "name": key,
                    "values": values,
                    "lowerIsBetter": False,
                    "shouldAlert": eval_config.get(key, {}).get("shouldAlert", False),
                    "alertThreshold": eval_config.get(key, {}).get(
                        "alertThreshold", None
                    ),
                })
            else:
                self.log(
                    f"LLM judge result for key '{key}' is not numeric and will not be included in perfherder metrics: {values}"
                )

        return return_results


class TranslationsLlmJudge(_LlmJudge):
    """
    Judge a translation based on an LLM's judgement.

    Returns:
    {
        "score": int,
        "verdict": str,
        "explanation": str,
        "model": str,
    }

    perfherder_metrics: [
        {
          name: "bleu",
          unit: "bleu",
          lowerIsBetter: false,
          shouldAlert: false,
        },
        {
          name: "chrF",
          unit: "chrF",
          lowerIsBetter: false,
          shouldAlert: false,
        },
    ]
    """

    def run(self, payloads: list[dict[str, Any]]) -> dict:
        results: list[dict[str, Any]] = []
        for payload in payloads:
            missing = [key for key in ("src", "trg", "ref") if key not in payload]
            if missing:
                raise ValueError(
                    f"Missing required translation fields {missing} in {payload}"
                )
            src = payload["src"]
            trg = payload["trg"]
            ref = payload["ref"]

            user_prompt = (
                f"Source: {src}Reference: {ref}\nHypothesis: {trg}\n"
                'Return JSON with fields: score (0-100), verdict ("good"|"ok"|"bad"), explanation (short).'
            )

            response_format = {
                "type": "json_schema",
                "json_schema": {
                    "name": "basic_quality_eval",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "score": {"type": "integer"},
                            "verdict": {"type": "string"},
                            "explanation": {"type": "string"},
                        },
                        "required": ["score", "verdict", "explanation"],
                        "additionalProperties": False,
                    },
                },
            }

            model = payload.get("model", self.model)
            response = self.query_llm(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a translation quality judge. Rate adequacy/fluency.",
                    },
                    {"role": "user", "content": user_prompt},
                ],
                response_format=response_format,
            )

            score = response.get("score")
            if score is None:
                raise ValueError(f"Missing score in LLM judge response: {response}")
            if isinstance(score, str):
                try:
                    score = float(score)
                except ValueError as exc:
                    raise ValueError(
                        f"Invalid score value in LLM judge response: {response}"
                    ) from exc

            results.append({
                "score": score,
                "verdict": response.get("verdict"),
                "explanation": response.get("explanation"),
                "model": model,
            })

        if not results:
            raise ValueError("No evaluation results were produced for LLM judge data.")

        scores = [result.get("score", 0) for result in results]
        return {
            "name": "llm-judge",
            "values": scores,
            "lowerIsBetter": False,
        }
