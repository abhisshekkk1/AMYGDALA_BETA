import os
import json
import re
from typing import List, Dict, Any, Optional, Type, TypeVar
from pydantic import BaseModel, ValidationError
import httpx
from app.core.config import settings

T = TypeVar("T", bound=BaseModel)


class AIProviderService:
    """
    Provider-independent AI integration layer supporting OpenAI, Google Gemini,
    Ollama, and any OpenAI-compatible API endpoint.
    All LLM calls are centralized here — no direct third-party API calls outside this class.
    """

    # ------------------------------------------------------------------ #
    #  Public: Chat Response (RAG-grounded)                               #
    # ------------------------------------------------------------------ #

    @classmethod
    async def generate_chat_response(
        cls,
        messages: List[Dict[str, str]],
        context_chunks: List[Dict[str, Any]],
        provider: str = "openai",
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        """
        Generates grounded response using retrieved document context.
        """
        # Grounding context preparation
        if context_chunks:
            context_text = "\n\n".join([
                f"--- SOURCE: {c['document_title']} (Page {c['page_number']}) ---\n{c['content']}"
                for c in context_chunks
            ])
            system_grounding = (
                "You are AMYGDALA, an elite academic AI tutor. "
                "You MUST answer the student's question based strictly on the provided SOURCE DOCUMENTS below. "
                "Include clear citations in format [Document Name, Page X]. "
                "If the answer cannot be determined from the source materials, explicitly state: "
                "'The uploaded study materials do not contain sufficient information to answer this question.'\n\n"
                f"SOURCE MATERIALS:\n{context_text}"
            )
        else:
            system_grounding = (
                "You are AMYGDALA, an elite academic AI tutor. "
                "No specific document context was retrieved. Answer politely and indicate that "
                "uploading or selecting a relevant study document will provide source-grounded answers."
            )

        augmented_messages = [{"role": "system", "content": system_grounding}] + messages
        return await cls._dispatch(
            messages=augmented_messages,
            provider=provider,
            api_key=api_key,
            model_name=model_name,
            base_url=base_url,
            temperature=temperature,
            context_chunks=context_chunks
        )

    # ------------------------------------------------------------------ #
    #  Public: Structured JSON Generation with auto-retry                 #
    # ------------------------------------------------------------------ #

    @classmethod
    async def generate_structured_json(
        cls,
        prompt: str,
        provider: str = "openai",
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: float = 0.2,
        schema_model: Optional[Type[T]] = None,
        context_chunks: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generates and parses a structured JSON response from the LLM.

        Features:
        - Strips markdown fences (```json ... ```) automatically.
        - Validates against a Pydantic model if schema_model is provided.
        - Performs 1 automatic self-correction retry if the first response is malformed JSON.
        - Returns a dict with keys: data (parsed), raw (original text), status ("success"|"error"|"notice").
        """
        messages = [{"role": "user", "content": prompt}]
        response = await cls._dispatch(
            messages=messages,
            provider=provider,
            api_key=api_key,
            model_name=model_name,
            base_url=base_url,
            temperature=temperature,
            context_chunks=context_chunks or []
        )

        if response.get("status") in ("error", "notice"):
            return response

        raw_text = response.get("content", "")
        parsed = cls._parse_json(raw_text)

        if parsed is not None:
            if schema_model:
                try:
                    validated = schema_model.model_validate(parsed) if isinstance(parsed, dict) else parsed
                    return {"data": validated.model_dump() if hasattr(validated, "model_dump") else parsed,
                            "raw": raw_text, "status": "success"}
                except (ValidationError, Exception):
                    pass  # fall through to retry
            return {"data": parsed, "raw": raw_text, "status": "success"}

        # --- Self-correction retry ---
        correction_prompt = (
            f"Your previous response was not valid JSON. "
            f"Return ONLY a valid JSON object or array — no markdown fences, no preamble, no commentary.\n\n"
            f"Original task:\n{prompt}\n\n"
            f"Your invalid response was:\n{raw_text}"
        )
        retry_messages = [{"role": "user", "content": correction_prompt}]
        retry_response = await cls._dispatch(
            messages=retry_messages,
            provider=provider,
            api_key=api_key,
            model_name=model_name,
            base_url=base_url,
            temperature=0.0,  # deterministic on retry
            context_chunks=[]
        )

        if retry_response.get("status") in ("error", "notice"):
            return retry_response

        retry_text = retry_response.get("content", "")
        retry_parsed = cls._parse_json(retry_text)

        if retry_parsed is not None:
            return {"data": retry_parsed, "raw": retry_text, "status": "success", "retried": True}

        return {
            "data": None,
            "raw": retry_text,
            "status": "error",
            "detail": "LLM returned malformed JSON after self-correction retry."
        }

    # ------------------------------------------------------------------ #
    #  Private: Dispatch router                                           #
    # ------------------------------------------------------------------ #

    @classmethod
    async def _dispatch(
        cls,
        messages: List[Dict[str, str]],
        provider: str,
        api_key: Optional[str],
        model_name: Optional[str],
        base_url: Optional[str],
        temperature: float,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Routes to the correct provider adapter with key validation."""
        effective_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")

        if provider == "ollama":
            return await cls._call_ollama(
                messages=messages,
                model_name=model_name or settings.DEFAULT_OLLAMA_MODEL,
                base_url=base_url or settings.DEFAULT_OLLAMA_BASE_URL,
                temperature=temperature
            )
        elif provider == "gemini":
            gemini_key = api_key or os.getenv("GEMINI_API_KEY")
            if not gemini_key:
                return cls._generate_offline_grounded_response(
                    messages, context_chunks,
                    "Gemini API key is not configured. Please add it in Settings → AI Provider."
                )
            return await cls._call_gemini(
                messages=messages,
                api_key=gemini_key,
                model_name=model_name or settings.DEFAULT_GEMINI_MODEL,
                temperature=temperature
            )
        elif provider in ["openai", "custom"]:
            if not effective_key and provider != "custom":
                return cls._generate_offline_grounded_response(
                    messages, context_chunks,
                    "OpenAI API key is not configured. Please add it in Settings → AI Provider."
                )
            return await cls._call_openai_compatible(
                messages=messages,
                api_key=effective_key or "sk-no-key-required",
                model_name=model_name or settings.DEFAULT_OPENAI_MODEL,
                base_url=base_url or "https://api.openai.com/v1",
                temperature=temperature
            )
        else:
            return cls._generate_offline_grounded_response(
                messages, context_chunks,
                f"Provider '{provider}' is not recognised. Supported: openai, gemini, ollama, custom."
            )

    # ------------------------------------------------------------------ #
    #  Private: Provider adapters                                         #
    # ------------------------------------------------------------------ #

    @classmethod
    async def _call_openai_compatible(
        cls,
        messages: List[Dict[str, str]],
        api_key: str,
        model_name: str,
        base_url: str,
        temperature: float
    ) -> Dict[str, Any]:
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return {"content": content, "status": "success", "provider": "openai_compatible"}
                elif res.status_code in (401, 403):
                    return {
                        "content": f"⚠️ Invalid or unauthorised API key (HTTP {res.status_code}). "
                                   "Please update your OpenAI key in Settings → AI Provider.",
                        "status": "error",
                        "provider": "openai_compatible",
                        "http_status": res.status_code
                    }
                elif res.status_code == 429:
                    return {
                        "content": "⚠️ OpenAI rate limit reached. Please wait a moment and try again.",
                        "status": "error",
                        "provider": "openai_compatible",
                        "http_status": 429
                    }
                else:
                    return {
                        "content": f"⚠️ API Error ({res.status_code}): {res.text[:300]}",
                        "status": "error",
                        "provider": "openai_compatible",
                        "http_status": res.status_code
                    }
        except httpx.TimeoutException:
            return {"content": "⚠️ Request to OpenAI timed out. Please retry.", "status": "error"}
        except Exception as e:
            return {"content": f"⚠️ Connection failed to LLM endpoint: {str(e)}", "status": "error"}

    @classmethod
    async def _call_gemini(
        cls,
        messages: List[Dict[str, str]],
        api_key: str,
        model_name: str,
        temperature: float
    ) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        gemini_contents = []
        for m in messages:
            role = "user" if m["role"] in ["user", "system"] else "model"
            gemini_contents.append({"role": role, "parts": [{"text": m["content"]}]})

        payload = {
            "contents": gemini_contents,
            "generationConfig": {"temperature": temperature}
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {"content": content, "status": "success", "provider": "gemini"}
                elif res.status_code in (400, 401, 403):
                    return {
                        "content": f"⚠️ Invalid or unauthorised Gemini API key (HTTP {res.status_code}). "
                                   "Please update your key in Settings → AI Provider.",
                        "status": "error",
                        "provider": "gemini",
                        "http_status": res.status_code
                    }
                elif res.status_code == 429:
                    return {
                        "content": "⚠️ Gemini API rate limit reached. Please wait and retry.",
                        "status": "error",
                        "provider": "gemini",
                        "http_status": 429
                    }
                else:
                    return {
                        "content": f"⚠️ Gemini API Error ({res.status_code}): {res.text[:300]}",
                        "status": "error",
                        "provider": "gemini",
                        "http_status": res.status_code
                    }
        except httpx.TimeoutException:
            return {"content": "⚠️ Request to Gemini API timed out. Please retry.", "status": "error"}
        except Exception as e:
            return {"content": f"⚠️ Connection failed to Gemini API: {str(e)}", "status": "error"}

    @classmethod
    async def _call_ollama(
        cls,
        messages: List[Dict[str, str]],
        model_name: str,
        base_url: str,
        temperature: float
    ) -> Dict[str, Any]:
        url = f"{base_url.rstrip('/')}/api/chat"
        payload = {
            "model": model_name,
            "messages": messages,
            "options": {"temperature": temperature},
            "stream": False
        }
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["message"]["content"]
                    return {"content": content, "status": "success", "provider": "ollama"}
                else:
                    return {
                        "content": f"⚠️ Ollama error ({res.status_code}): {res.text[:300]}",
                        "status": "error",
                        "provider": "ollama"
                    }
        except Exception as e:
            return {
                "content": (
                    f"⚠️ Local Ollama service is not running at {base_url}. "
                    "Please start Ollama or configure an API key in Settings → AI Provider."
                ),
                "status": "error"
            }

    # ------------------------------------------------------------------ #
    #  Private: Offline fallback                                          #
    # ------------------------------------------------------------------ #

    @classmethod
    def _generate_offline_grounded_response(
        cls,
        messages: List[Dict[str, str]],
        context_chunks: List[Dict[str, Any]],
        notice_message: str
    ) -> Dict[str, Any]:
        """
        Graceful local offline response that extracts and presents verifiable text from uploaded documents
        while cleanly informing the user to set up their preferred LLM API key in Settings.
        """
        last_user_msg = messages[-1]["content"] if messages else ""
        if not context_chunks:
            return {
                "content": (
                    f"**Notice:** {notice_message}\n\n"
                    "Furthermore, no relevant sections were found in your library for this query. "
                    "Please upload a study document or configure your AI Provider in the **Settings** menu."
                ),
                "status": "notice"
            }

        top_chunk = context_chunks[0]
        excerpts_bullet = "\n\n".join([
            f"> **Page {c['page_number']} — {c['document_title']}:**\n> \"{c['content'][:300]}...\""
            for c in context_chunks[:3]
        ])

        formatted = (
            f"### 📖 Grounded Source Extract\n\n"
            f"Based on your uploaded document **{top_chunk['document_title']}** (Page {top_chunk['page_number']}), "
            f"here are the direct excerpts addressing: *\"{last_user_msg}\"*\n\n"
            f"{excerpts_bullet}\n\n"
            f"---\n"
            f"💡 **AI Configuration Note**: {notice_message}\n"
            f"Once you connect an API key (OpenAI, Gemini) or run local Ollama, full conversational synthesis and reasoning will be activated."
        )

        return {
            "content": formatted,
            "status": "notice",
            "provider": "offline_extractor"
        }

    # ------------------------------------------------------------------ #
    #  Private: JSON parsing utility                                      #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _parse_json(text: str) -> Any:
        """
        Strips markdown fences and attempts to parse JSON.
        Returns the parsed object or None on failure.
        """
        # Strip ```json ... ``` or ``` ... ``` fences
        stripped = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE)
        stripped = re.sub(r"\s*```$", "", stripped.strip())

        # Try direct parse
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            pass

        # Try extracting the first JSON array
        arr_match = re.search(r'\[\s*\{.*\}\s*\]', stripped, re.DOTALL)
        if arr_match:
            try:
                return json.loads(arr_match.group(0))
            except json.JSONDecodeError:
                pass

        # Try extracting the first JSON object
        obj_match = re.search(r'\{.*\}', stripped, re.DOTALL)
        if obj_match:
            try:
                return json.loads(obj_match.group(0))
            except json.JSONDecodeError:
                pass

        return None
