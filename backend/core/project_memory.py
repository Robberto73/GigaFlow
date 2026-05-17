import json
from pathlib import Path
from typing import Dict, Any

MEMORY_PATH = Path("./project_memory.json")

DEFAULT_MEMORY = {
    "project_name": "GigaFlow",
    "description": "Visual pipeline builder for AI agents using GigaChat or local LLMs",
    "tool_requirements": (
        "All tools must use the @gigaflow_tool decorator.\n\n"
        "Example structure:\n"
        "```python\n"
        "def gigaflow_tool(description='', parameters=None, tool_type='generic'):\n"
        "    def decorator(func):\n"
        "        func._is_gigaflow_tool = True\n"
        "        func.description = description\n"
        "        func.parameters = parameters or {}\n"
        "        func.tool_type = tool_type\n"
        "        return func\n"
        "    return decorator\n\n"
        "@gigaflow_tool(\n"
        "    description='What this tool does',\n"
        "    parameters={'param_name': {'type': 'string', 'description': 'What it means'}},\n"
        "    tool_type='text|analytics|data|filesystem|ui|pipeline'\n"
        ")\n"
        "def my_tool(param_name: str) -> str:\n"
        "    return param_name.upper()\n"
        "```\n\n"
        "Rules:\n"
        "1. Always include the gigaflow_tool decorator\n"
        "2. Parameters must be typed\n"
        "3. Return a string or serializable value\n"
        "4. Keep tools focused on single responsibility\n"
        "5. Use async only if doing I/O\n"
    ),
    "available_tools": [],
    "pipeline_patterns": (
        "Common pipeline patterns:\n"
        "- Input -> Agent -> Output (basic chat)\n"
        "- Input -> Agent -> Judge -> Output (quality control)\n"
        "- Input -> Agent -> Tool -> Output (tool usage)\n"
        "- Input -> RAG -> Agent -> Output (document Q&A)\n"
        "- Input -> Agent -> Condition -> [Agent A | Agent B] -> Output (branching)\n"
        "- Input -> Loop(Agent -> Judge) -> Output (iterative improvement)\n"
    ),
    "custom_notes": ""
}

class ProjectMemory:
    def __init__(self):
        self._data = {}
        self._load()

    def _load(self):
        if MEMORY_PATH.exists():
            try:
                with open(MEMORY_PATH, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
            except:
                self._data = DEFAULT_MEMORY.copy()
        else:
            self._data = DEFAULT_MEMORY.copy()
            self._save()

    def _save(self):
        with open(MEMORY_PATH, "w", encoding="utf-8") as f:
            json.dump(self._data, f, ensure_ascii=False, indent=2)

    def get(self) -> Dict[str, Any]:
        return self._data.copy()

    def get_context(self) -> str:
        return (
            f"You are working with GigaFlow — a visual pipeline builder for AI agents.\n\n"
            f"Project: {self._data.get('project_name', 'GigaFlow')}\n"
            f"Description: {self._data.get('description', '')}\n\n"
            f"TOOL REQUIREMENTS:\n"
            f"{self._data.get('tool_requirements', '')}\n\n"
            f"PIPELINE PATTERNS:\n"
            f"{self._data.get('pipeline_patterns', '')}\n\n"
            f"CUSTOM NOTES:\n"
            f"{self._data.get('custom_notes', '')}\n\n"
            f"When asked to create tools, ALWAYS follow the @gigaflow_tool decorator pattern.\n"
            f"When asked about pipelines, suggest patterns from the list above."
        )

    def update(self, key: str, value: Any):
        self._data[key] = value
        self._save()

    def update_tools_list(self, tools: list):
        self._data["available_tools"] = tools
        self._save()

memory = ProjectMemory()
