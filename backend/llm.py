# """
# backend/llm.py
# Thin client around the KakushIN LLM API (Claude 4 via AWS Bedrock,
# exposed to hackathon teams as an HTTP endpoint with Bearer auth).

# Usage:
#     from llm import ask_llm
#     reply = await ask_llm("Explain this transaction", system="You are a financial guardian.")
#     data = await ask_llm(prompt, system=sys_prompt, json_mode=True)  # returns parsed dict
# """
# import json
# import os
# from typing import Optional, Union

# import httpx
# from dotenv import load_dotenv

# load_dotenv()

# KAKUSHIN_API_URL = os.getenv("KAKUSHIN_API_URL", "")
# KAKUSHIN_API_KEY = os.getenv("KAKUSHIN_API_KEY", "")

# DEFAULT_SYSTEM_PROMPT = (
#     "You are ArthaRakshak, an AI-powered personal finance guardian for "
#     "Indian users. Be clear, accurate, and culturally relevant to India."
# )

# REQUEST_TIMEOUT_SECONDS = 60.0


# class LLMError(Exception):
#     """Raised when the KakushIN LLM API call fails or returns malformed data."""


# async def ask_llm(
#     prompt: str,
#     system: Optional[str] = None,
#     json_mode: bool = False,
#     max_tokens: int = 1024,
#     temperature: float = 0.4,
# ) -> Union[str, dict]:
#     """
#     Sends a prompt to the KakushIN LLM API.

#     Args:
#         prompt: the user-facing prompt / question / content to analyze.
#         system: optional system prompt; defaults to a generic ArthaRakshak persona.
#         json_mode: if True, instructs the model to return strict JSON and
#                    parses+returns it as a dict. Raises LLMError if parsing fails.
#         max_tokens: max tokens in the completion.
#         temperature: sampling temperature.

#     Returns:
#         str (raw text) if json_mode is False, otherwise a parsed dict.
#     """
#     if not KAKUSHIN_API_URL or not KAKUSHIN_API_KEY:
#         raise LLMError(
#             "KAKUSHIN_API_URL / KAKUSHIN_API_KEY are not configured. "
#             "Set them in backend/.env"
#         )

#     system_prompt = system or DEFAULT_SYSTEM_PROMPT
#     if json_mode:
#         system_prompt += (
#             "\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown code "
#             "fences, no preamble, no explanation outside the JSON object."
#         )

#     payload = {
#         "model": "kakushin-claude-4",
#         "max_tokens": max_tokens,
#         "temperature": temperature,
#         "system": system_prompt,
#         "messages": [
#             {"role": "user", "content": prompt},
#         ],
#     }

#     headers = {
#         "Authorization": f"Bearer {KAKUSHIN_API_KEY}",
#         "Content-Type": "application/json",
#     }

#     try:
#         async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
#             response = await client.post(KAKUSHIN_API_URL, json=payload, headers=headers)
#             response.raise_for_status()
#             data = response.json()
#     except httpx.HTTPStatusError as e:
#         raise LLMError(f"KakushIN API returned an error: {e.response.status_code} {e.response.text}") from e
#     except httpx.RequestError as e:
#         raise LLMError(f"Failed to reach KakushIN API: {e}") from e

#     text = _extract_text(data)

#     if not json_mode:
#         return text

#     cleaned = _strip_json_fences(text)
#     try:
#         return json.loads(cleaned)
#     except json.JSONDecodeError as e:
#         raise LLMError(f"LLM did not return valid JSON: {e}\nRaw response: {text}") from e


# def _extract_text(data: dict) -> str:
#     """
#     Extracts concatenated text from an Anthropic-style /v1/messages response:
#     { "content": [ {"type": "text", "text": "..."}, ... ] }
#     Falls back gracefully if the KakushIN wrapper shape differs slightly.
#     """
#     content = data.get("content")
#     if isinstance(content, list):
#         parts = [block.get("text", "") for block in content if block.get("type") == "text"]
#         joined = "\n".join(p for p in parts if p)
#         if joined:
#             return joined

#     # Fallbacks for alternate response shapes some gateways use.
#     if isinstance(data.get("text"), str):
#         return data["text"]
#     if isinstance(data.get("completion"), str):
#         return data["completion"]

#     raise LLMError(f"Unrecognized KakushIN API response shape: {data}")


# def _strip_json_fences(text: str) -> str:
#     cleaned = text.strip()
#     if cleaned.startswith("```"):
#         cleaned = cleaned.strip("`")
#         if cleaned.lower().startswith("json"):
#             cleaned = cleaned[4:]
#     return cleaned.strip()



"""
backend/llm.py
Thin client around the Groq API (OpenAI-compatible chat completions endpoint).
TEMPORARY: swapped in for KakushIN until hackathon-day credentials are issued.
Swapping back later only requires editing this file — callers (ask_llm signature)
stay identical.

Usage:
    from llm import ask_llm
    reply = await ask_llm("Explain this transaction", system="You are a financial guardian.")
    data = await ask_llm(prompt, system=sys_prompt, json_mode=True)  # returns parsed dict
"""
import json
import os
from typing import Optional, Union

import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

DEFAULT_SYSTEM_PROMPT = (
    "You are ArthaRakshak, an AI-powered personal finance guardian for "
    "Indian users. Be clear, accurate, and culturally relevant to India."
)

REQUEST_TIMEOUT_SECONDS = 60.0


class LLMError(Exception):
    """Raised when the LLM API call fails or returns malformed data."""


async def ask_llm(
    prompt: str,
    system: Optional[str] = None,
    json_mode: bool = False,
    max_tokens: int = 1024,
    temperature: float = 0.4,
) -> Union[str, dict]:
    """
    Sends a prompt to the Groq API. Same signature/contract as the old
    KakushIN version, so every caller in the codebase keeps working unchanged.

    Returns:
        str (raw text) if json_mode is False, otherwise a parsed dict.
    """
    if not GROQ_API_KEY:
        raise LLMError(
            "GROQ_API_KEY is not configured. Set it in backend/.env"
        )

    system_prompt = system or DEFAULT_SYSTEM_PROMPT
    if json_mode:
        system_prompt += (
            "\n\nIMPORTANT: Respond with ONLY valid JSON. No markdown code "
            "fences, no preamble, no explanation outside the JSON object."
        )

    payload = {
        "model": GROQ_MODEL,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(GROQ_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as e:
        raise LLMError(f"Groq API returned an error: {e.response.status_code} {e.response.text}") from e
    except httpx.RequestError as e:
        raise LLMError(f"Failed to reach Groq API: {e}") from e

    text = _extract_text(data)

    if not json_mode:
        return text

    cleaned = _strip_json_fences(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise LLMError(f"LLM did not return valid JSON: {e}\nRaw response: {text}") from e


def _extract_text(data: dict) -> str:
    """Extracts the assistant's text from an OpenAI-style chat completion response."""
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        raise LLMError(f"Unexpected response shape from Groq API: {data}") from e


def _strip_json_fences(text: str) -> str:
    """Strips ```json / ``` fences if the model wrapped its JSON output in them."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    return cleaned.strip()