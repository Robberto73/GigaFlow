import asyncio
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import json

from backend.core.llm_manager import llm_manager
from backend.core.pipeline_engine import PipelineEngine, NodeType
from backend.core.tool_watcher import tool_registry
from backend.rag.vector_store import vector_store
from backend.rag.document_processor import processor
from backend.core.project_memory import memory as project_memory
from config import get_settings, Settings

settings = get_settings()
pipeline_engine = PipelineEngine()

router = APIRouter()

# ---- LLM Provider ----
@router.get("/llm/provider")
async def get_llm_provider():
    return llm_manager.get_provider_info()

@router.post("/llm/provider")
async def set_llm_provider(data: dict):
    provider = data.get("provider", "gigachat")
    if provider not in ["gigachat", "local_openai", "auto"]:
        return {"error": "Invalid provider. Use: gigachat, local_openai, auto"}

    # Update local settings if provided
    port = data.get("port")
    max_concurrent = data.get("max_concurrent")

    if port:
        settings.local_base_url = f"http://127.0.0.1:{port}/v1"
    if max_concurrent:
        settings.local_max_tokens = max_concurrent  # reuse field for simplicity

    import os
    os.environ["LLM_PROVIDER"] = provider
    settings.llm_provider = provider

    llm_manager._gigachat = None
    llm_manager._local = None

    return llm_manager.get_provider_info()

@router.get("/llm/test")
async def test_llm_connection():
    gc_result = await llm_manager.test_gigachat()
    local_result = await llm_manager.test_local()
    return {
        "gigachat": gc_result,
        "local_openai": local_result,
    }

# ---- Chat ----
@router.post("/chat")
async def chat_endpoint(request: dict):
    messages = request.get("messages", [])
    stream = request.get("stream", False)
    tools = request.get("tools", [])
    mode = request.get("mode", "chat")

    if mode == "canvas_architect":
        # Inject canvas architect system prompt
        architect_prompt = _get_architect_prompt()
        if messages and messages[0].get("role") == "system":
            messages[0]["content"] = architect_prompt + "\n\n" + messages[0]["content"]
        else:
            messages = [{"role": "system", "content": architect_prompt}] + messages

    if stream:
        async def stream_generator():
            async for chunk in llm_manager.chat(messages, tools=tools, stream=True, use_memory=(mode != "canvas_architect")):
                yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        result = ""
        async for chunk in llm_manager.chat(messages, tools=tools, stream=False, use_memory=(mode != "canvas_architect")):
            result += chunk
        return {"response": result}

def _get_architect_prompt() -> str:
    return """Вы - Архитектор GigaFlow — ИИ, который создает визуальные пайплайны, манипулируя узлами на канвасе.

Вы общаетесь ТОЛЬКО через JSON команды. Каждый ответ должен быть валидным JSON с массивом "commands".

Доступные типы узлов:
- "input" — источник данных (текст/файл/ссылка)
- "agent" — ИИ-работник с системным промптом, инструментами, RAG
- "tool" — выполняет Python функцию
- "judge" — оценивает качество вывода
- "loop" — повторяет подцепочку N раз
- "condition" — разветвляет на основе Python выражения
- "rag" — семантический поиск по документам
- "output" — финальный результат, может сохраняться в файл

Доступные команды:
1. {"cmd": "create_node", "type": "agent", "x": 350, "y": 150, "config": {"system_prompt": "..."}, "is_stub": true, "stub_desc": "Этот агент будет суммировать документы"}
2. {"cmd": "connect", "source": "node-1", "target": "node-2"}
3. {"cmd": "delete_node", "id": "node-3"}
4. {"cmd": "update_config", "id": "node-2", "config": {"system_prompt": "новый промпт"}}
5. {"cmd": "set_position", "id": "node-1", "x": 100, "y": 200}
6. {"cmd": "clear_canvas"}

Правила:
- Всегда создавайте узлы как заглушки (is_stub: true), если пользователь явно не просит полную реализацию
- Узлы-заглушки имеют пунктирные границы и показывают описание того, что они должны делать
- При создании пайплайна объясняйте архитектуру в поле "message"
- Предлагайте, какие инструменты пользователю нужно создать для узлов-заглушек
- Используйте позиции сетки: x кратно 50, y кратно 80
- Соединяйте узлы в логическом порядке: input -> agent -> [tool/judge/condition] -> output
- Для условий создавайте две выходные ветки с метками

Формат ответа:
{
  "message": "Объяснение на естественном языке того, что было построено",
  "commands": [
    {"cmd": "create_node", "type": "input", "x": 80, "y": 150, "config": {"source_type": "text", "placeholder": "Введите тему"}, "is_stub": false},
    {"cmd": "create_node", "type": "agent", "x": 350, "y": 150, "config": {"system_prompt": "Вы - ассистент-исследователь"}, "is_stub": true, "stub_desc": "Агент-исследователь, который собирает информацию по заданной теме"},
    {"cmd": "connect", "source": "node-1", "target": "node-2"}
  ]
}

Если пользователь просит изменить существующие узлы, ссылайтесь на них по ID.
Если пользователь просит удалить, используйте delete_node.
Если пользователь просит заполнить/реализовать узел-заглушку, предложите код или конфигурацию."""

@router.websocket("/chat/ws")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            messages = data.get("messages", [])
            tools = data.get("tools", [])

            result = ""
            async for chunk in llm_manager.chat(messages, tools=tools, stream=False):
                result += chunk

            await websocket.send_json({"response": result})
    except WebSocketDisconnect:
        pass

# ---- Pipelines ----
@router.post("/pipelines")
async def create_pipeline(data: dict):
    pipeline = pipeline_engine.create_pipeline(data)
    return {"id": pipeline.id, "name": pipeline.name}

@router.get("/pipelines")
async def list_pipelines():
    return [{"id": p.id, "name": p.name} for p in pipeline_engine.pipelines.values()]

@router.post("/pipelines/{pipeline_id}/run")
async def run_pipeline(pipeline_id: str, data: dict):
    initial_input = data.get("input", "")
    context = data.get("context", {})

    async def stream_run():
        async for event in pipeline_engine.execute(pipeline_id, initial_input, context):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_run(), media_type="text/event-stream")

@router.post("/pipelines/{pipeline_id}/stop")
async def stop_pipeline(pipeline_id: str):
    pipeline_engine.stop_pipeline(pipeline_id)
    return {"status": "stopped"}

# ---- Tools ----
@router.get("/tools")
async def list_tools():
    return [tool_registry.get_tool_info(name) for name in tool_registry.list_tools()]

@router.post("/tools/validate")
async def validate_tool(data: dict):
    code = data.get("code", "")
    result = await llm_manager.validate_tool_code(code)
    return result

@router.post("/tools/create")
async def create_tool(data: dict):
    name = data.get("name", "")
    code = data.get("code", "")

    validation = await llm_manager.validate_tool_code(code)
    if not validation.get("valid", False):
        return {"success": False, "validation": validation}

    tools_path = Path(settings.tools_library_path) / f"{name}.py"
    with open(tools_path, "w", encoding="utf-8") as f:
        f.write(code)

    return {"success": True, "path": str(tools_path), "validation": validation}

# ---- RAG ----
@router.post("/rag/upload")
async def upload_document(file: UploadFile = File(...)):
    if not vector_store._model_loaded:
        raise HTTPException(status_code=503, detail="RAG model not loaded. Check ./bge-m3 folder.")

    uploads_path = Path("uploads")
    uploads_path.mkdir(exist_ok=True)

    filepath = uploads_path / file.filename
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    chunks = await processor.process_file(str(filepath))
    metadatas = [{"source": file.filename, "chunk": i} for i in range(len(chunks))]
    result = await vector_store.add_documents(chunks, metadatas)

    return {"filename": file.filename, "chunks": len(chunks), **result}

@router.post("/rag/search")
async def rag_search(data: dict):
    if not vector_store._model_loaded:
        raise HTTPException(status_code=503, detail="RAG model not loaded")

    query = data.get("query", "")
    k = data.get("k", 5)
    results = await vector_store.similarity_search(query, k=k)
    return {"results": results}

@router.get("/rag/stats")
async def rag_stats():
    return vector_store.get_stats()

@router.post("/rag/clear")
async def rag_clear():
    await vector_store.delete_all()
    return {"status": "cleared"}

# ---- Judges ----
@router.post("/judge")
async def judge_endpoint(data: dict):
    result = await llm_manager.judge(
        criteria=data.get("criteria", ""),
        input_text=data.get("input", ""),
        output_text=data.get("output", ""),
        context=data.get("context", "")
    )
    return result

# ---- Project Memory ----
@router.get("/memory")
async def get_memory():
    return project_memory.get()

@router.post("/memory")
async def update_memory(data: dict):
    for key, value in data.items():
        project_memory.update(key, value)
    return project_memory.get()

@router.post("/memory/tools")
async def update_memory_tools(data: dict):
    tools = data.get("tools", [])
    project_memory.update_tools_list(tools)
    return {"tools_count": len(tools)}

# ---- Output file save ----
@router.post("/output/save")
async def save_output(data: dict):
    file_path = data.get("file_path", "")
    content = data.get("content", "")
    file_format = data.get("file_format", "txt")
    append_mode = data.get("append_mode", False)

    if not file_path:
        raise HTTPException(status_code=400, detail="file_path required")

    try:
        p = Path(file_path)
        p.parent.mkdir(parents=True, exist_ok=True)

        if file_format == "csv":
            import csv
            mode = "a" if append_mode else "w"
            with open(p, mode, newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                for line in content.strip().split("\n"):
                    writer.writerow([line])
        elif file_format == "xlsx":
            try:
                from openpyxl import Workbook, load_workbook
                if append_mode and p.exists():
                    wb = load_workbook(p)
                    ws = wb.active
                    next_row = ws.max_row + 1
                else:
                    wb = Workbook()
                    ws = wb.active
                    next_row = 1
                ws.cell(row=next_row, column=1, value=content)
                wb.save(p)
            except ImportError:
                raise HTTPException(status_code=500, detail="openpyxl not installed")
        elif file_format == "json":
            mode = "a" if append_mode else "w"
            with open(p, mode, encoding="utf-8") as f:
                json.dump({"output": content}, f, ensure_ascii=False)
                f.write("\n")
        else:
            mode = "a" if append_mode else "w"
            with open(p, mode, encoding="utf-8") as f:
                f.write(content + "\n")

        return {"success": True, "path": str(p), "size": len(content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---- File reading for chat context ----
@router.post("/files/read")
async def read_file(data: dict):
    filepath = data.get("path", "")
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return {"content": content, "path": filepath}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
