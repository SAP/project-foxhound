# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
from abc import ABC, abstractmethod
from typing import Any, Callable

import requests


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

    def __init__(self, log: Callable[[str], None], config: dict[str, Any]) -> None:
        super().__init__(log, config)
        self.endpoint = config.get(
            "endpoint",
            "https://mlpa-prod-prod-mozilla.global.ssl.fastly.net/v1/chat/completions",
        )
        self.model = config.get("model", "vertex_ai/mistral-small-2503")
        self.token = os.environ.get("MOZ_FXA_BEARER_TOKEN")

    def query_llm(self, messages: list[Any]):
        if not self.token:
            raise RuntimeError("Missing MOZ_FXA_BEARER_TOKEN for LLM evaluation.")
        resp = requests.post(
            self.endpoint,
            headers={
                "authorization": f"Bearer {self.token}",
                "content-type": "application/json",
                "service-type": "ai",
            },
            json={
                "model": self.model,
                "messages": messages,
                "stream": False,
            },
            timeout=30,
        )

        resp.raise_for_status()
        return resp.json()


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

    def run(self, payloads: list[dict[str, Any]]):
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

    requirements = []

    def run(self, payloads: list[dict[str, Any]]):
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

            response = self.query_llm([
                {
                    "role": "system",
                    "content": "You are a translation quality judge. Rate adequacy/fluency.",
                },
                {"role": "user", "content": user_prompt},
            ])

            message = response.get("choices", [{}])[0].get("message", {})
            content = message.get("content", "").strip()

            # Extract the JSON if it's returned with triple backticks.
            if content.startswith("```"):
                lines = content.splitlines()
                content = "\n".join(
                    line for line in lines if not line.strip().startswith("```")
                )

            parsed = json.loads(content)
            score = parsed.get("score")
            if score is None:
                raise ValueError(f"Missing score in LLM judge response: {parsed}")
            if isinstance(score, str):
                try:
                    score = float(score)
                except ValueError as exc:
                    raise ValueError(
                        f"Invalid score value in LLM judge response: {parsed}"
                    ) from exc

            results.append({
                "score": score,
                "verdict": parsed.get("verdict"),
                "explanation": parsed.get("explanation"),
                "model": response.get("model"),
            })

        if not results:
            raise ValueError("No evaluation results were produced for LLM judge data.")

        scores = [result.get("score", 0) for result in results]
        return {
            "name": "llm-judge",
            "values": scores,
            "lowerIsBetter": False,
        }
