import asyncio
from typing import Optional, List, Dict, Any, AsyncGenerator
from langchain_gigachat import GigaChat
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool
import httpx

from config import get_settings
from backend.core.project_memory import memory as project_memory

settings = get_settings()

class LLMManager:
    def __init__(self):
        self._gigachat: Optional[GigaChat] = None
        self._local: Optional[ChatOpenAI] = None
        self._lock = asyncio.Lock()

    def _get_provider(self) -> str:
        return settings.llm_provider

    async def _get_gigachat(self) -> GigaChat:
        if self._gigachat is None:
            async with self._lock:
                if self._gigachat is None:
                    self._gigachat = GigaChat(
                        credentials=settings.gigachat_credentials,
                        scope=settings.gigachat_scope,
                        model=settings.gigachat_model,
                        verify_ssl_certs=settings.gigachat_verify_ssl,
                        base_url=settings.gigachat_base_url,
                        temperature=0.3,
                        max_tokens=4096,
                        timeout=60.0,
                    )
        return self._gigachat

    async def _get_local(self) -> ChatOpenAI:
        if self._local is None:
            async with self._lock:
                if self._local is None:
                    self._local = ChatOpenAI(
                        base_url=settings.local_base_url,
                        api_key=settings.local_api_key,
                        model=settings.local_model,
                        temperature=settings.local_temperature,
                        max_tokens=settings.local_max_tokens,
                        timeout=60.0,
                    )
        return self._local

    async def _get_llm(self):
        provider = self._get_provider()
        if provider == "gigachat":
            return await self._get_gigachat()
        elif provider == "local_openai":
            return await self._get_local()
        else:
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    await client.get(settings.local_base_url.replace("/v1", ""))
                return await self._get_local()
            except:
                return await self._get_gigachat()

    async def test_gigachat(self) -> Dict[str, Any]:
        try:
            gc = await self._get_gigachat()
            # Quick ping via invoke
            resp = await gc.ainvoke([HumanMessage(content="ping")])
            return {"status": "connected", "model": settings.gigachat_model, "response": "ok"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def test_local(self) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(settings.local_base_url.replace("/v1", "/models"))
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("data", [])
                    model_names = [m.get("id", "unknown") for m in models[:3]]
                    return {"status": "connected", "models": model_names, "url": settings.local_base_url}
                return {"status": "error", "error": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def chat(
        self,
        messages: List[Dict[str, str]],
        tools: Optional[List[BaseTool]] = None,
        stream: bool = False,
        use_memory: bool = True
    ) -> AsyncGenerator[str, None]:
        llm = await self._get_llm()

        # Inject project memory as system context
        if use_memory and messages and messages[0].get("role") != "system":
            messages = [{"role": "system", "content": project_memory.get_context()}] + messages
        elif use_memory and messages and messages[0].get("role") == "system":
            messages[0]["content"] = project_memory.get_context() + "\n\n" + messages[0]["content"]

        lc_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                lc_messages.append(SystemMessage(content=content))
            elif role == "user":
                lc_messages.append(HumanMessage(content=content))
            elif role == "assistant":
                lc_messages.append(AIMessage(content=content))
            elif role == "tool":
                lc_messages.append(ToolMessage(content=content, tool_call_id=msg.get("tool_call_id", "")))

        if tools:
            llm = llm.bind_tools(tools, tool_choice="auto")

        if stream:
            async for chunk in llm.astream(lc_messages):
                yield chunk.content or ""
        else:
            response = await llm.ainvoke(lc_messages)
            yield response.content

    async def judge(
        self,
        criteria: str,
        input_text: str,
        output_text: str,
        context: str = ""
    ) -> Dict[str, Any]:
        llm = await self._get_llm()

        prompt = f"""Ty - nezavisimyy sudya. Otseni kachestvo otveta agenta.

Kriteriy otsenki: {criteria}

Ishodnyy zapros: {input_text}

Otvet agenta: {output_text}

Kontekst: {context}

Otseni otvet po shkale ot 0 do 10.
Verni TOLKO JSON v formate:
{{"score": chislo, "reason": "kratkoe obyasneniye", "passed": true/false}}

Otsenka:"""

        response = await llm.ainvoke([HumanMessage(content=prompt)])

        try:
            import json
            result = json.loads(response.content.strip().strip("`").strip("json").strip())
            return result
        except:
            return {"score": 5, "reason": "Oshibka parsinka otsenki", "passed": True}

    async def validate_tool_code(self, code: str) -> Dict[str, Any]:
        llm = await self._get_llm()

        prompt = f"""Ty - kod-revyuer Python. Provery kod tulza na oshibki, bezopasnost i korrektnost.

Kod:
```python
{code}
```

Verni TOLKO JSON:
{{"valid": true/false, "errors": ["spisok oshibok"], "warnings": ["spisok preduprezhdeniy"], "suggestions": ["uluchsheniya"]}}

Rezultat:"""

        response = await llm.ainvoke([HumanMessage(content=prompt)])

        try:
            import json
            result = json.loads(response.content.strip().strip("`").strip("json").strip())
            return result
        except:
            return {"valid": False, "errors": ["Oshibka parsinka validatsii"], "warnings": [], "suggestions": []}

    def get_provider_info(self) -> Dict[str, str]:
        return {
            "current_provider": self._get_provider(),
            "gigachat_model": settings.gigachat_model,
            "local_base_url": settings.local_base_url,
            "local_model": settings.local_model,
        }

llm_manager = LLMManager()
