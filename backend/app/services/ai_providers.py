import os
import json
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

class AIProviderService:
    """
    Provider-independent AI integration layer supporting OpenAI, Google Gemini,
    Ollama, and any OpenAI-compatible API endpoint.
    """

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
                "You are MENTORA, an elite academic AI tutor. "
                "You MUST answer the student's question based strictly on the provided SOURCE DOCUMENTS below. "
                "Include clear citations in format [Document Name, Page X]. "
                "If the answer cannot be determined from the source materials, explicitly state: "
                "'The uploaded study materials do not contain sufficient information to answer this question.'\n\n"
                f"SOURCE MATERIALS:\n{context_text}"
            )
        else:
            system_grounding = (
                "You are MENTORA, an elite academic AI tutor. "
                "No specific document context was retrieved. Answer politely and indicate that "
                "uploading or selecting a relevant study document will provide source-grounded answers."
            )

        augmented_messages = [{"role": "system", "content": system_grounding}] + messages

        # Check API key from arguments or environment
        effective_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")
        
        # Route based on provider
        if provider == "ollama":
            return await cls._call_ollama(
                messages=augmented_messages,
                model_name=model_name or settings.DEFAULT_OLLAMA_MODEL,
                base_url=base_url or settings.DEFAULT_OLLAMA_BASE_URL,
                temperature=temperature
            )
        elif provider == "gemini":
            gemini_key = api_key or os.getenv("GEMINI_API_KEY")
            if not gemini_key:
                return cls._generate_offline_grounded_response(messages, context_chunks, "Gemini API key is not configured. Please add it in Settings.")
            return await cls._call_gemini(
                messages=augmented_messages,
                api_key=gemini_key,
                model_name=model_name or settings.DEFAULT_GEMINI_MODEL,
                temperature=temperature
            )
        elif provider in ["openai", "custom"]:
            if not effective_key and provider != "custom":
                return cls._generate_offline_grounded_response(messages, context_chunks, "OpenAI API key is not configured. Please configure it in Settings.")
            return await cls._call_openai_compatible(
                messages=augmented_messages,
                api_key=effective_key or "sk-no-key-required",
                model_name=model_name or settings.DEFAULT_OPENAI_MODEL,
                base_url=base_url or "https://api.openai.com/v1",
                temperature=temperature
            )
        else:
            return cls._generate_offline_grounded_response(messages, context_chunks, f"Provider '{provider}' not configured.")

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
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    return {"content": content, "status": "success", "provider": "openai_compatible"}
                else:
                    return {
                        "content": f"⚠️ API Error ({res.status_code}): {res.text}",
                        "status": "error",
                        "provider": "openai_compatible"
                    }
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
        # Convert messages to Gemini format
        gemini_contents = []
        for m in messages:
            role = "user" if m["role"] in ["user", "system"] else "model"
            gemini_contents.append({"role": role, "parts": [{"text": m["content"]}]})

        payload = {
            "contents": gemini_contents,
            "generationConfig": {"temperature": temperature}
        }
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {"content": content, "status": "success", "provider": "gemini"}
                else:
                    return {"content": f"⚠️ Gemini API Error ({res.status_code}): {res.text}", "status": "error"}
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
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["message"]["content"]
                    return {"content": content, "status": "success", "provider": "ollama"}
                else:
                    return {"content": f"⚠️ Ollama error ({res.status_code}): {res.text}", "status": "error"}
        except Exception as e:
            return {
                "content": f"⚠️ Local Ollama service is not running at {base_url}. Please start Ollama or configure an API key in Settings.",
                "status": "error"
            }

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
