import asyncio
import os
import importlib.util
import sys
from pathlib import Path
from typing import Dict, Callable, Any
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from config import get_settings

settings = get_settings()

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Any] = {}
        self.functions: Dict[str, Callable] = {}

    def register(self, name: str, tool_class, func: Callable):
        self.tools[name] = tool_class
        self.functions[name] = func

    def get(self, name: str) -> Callable:
        return self.functions.get(name)

    def list_tools(self) -> list:
        return list(self.tools.keys())

    def get_tool_info(self, name: str) -> dict:
        tool = self.tools.get(name)
        if not tool:
            return {}
        return {
            "name": name,
            "description": getattr(tool, "description", ""),
            "parameters": getattr(tool, "parameters", {}),
            "type": getattr(tool, "tool_type", "generic"),
        }

tool_registry = ToolRegistry()

class ToolFileHandler(FileSystemEventHandler):
    def __init__(self, registry: ToolRegistry):
        self.registry = registry
        self._debounce = {}

    def on_modified(self, event):
        if event.is_directory or not event.src_path.endswith(".py"):
            return
        self._load_file(event.src_path)

    def on_created(self, event):
        if event.is_directory or not event.src_path.endswith(".py"):
            return
        self._load_file(event.src_path)

    def _load_file(self, filepath: str):
        path = Path(filepath)
        module_name = path.stem

        if module_name.startswith("_"):
            return

        try:
            spec = importlib.util.spec_from_file_location(module_name, filepath)
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)

            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if callable(attr) and hasattr(attr, "_is_gigaflow_tool"):
                    self.registry.register(attr_name, attr, attr)
                    print(f"[ToolWatcher] Loaded tool: {attr_name}")
        except Exception as e:
            print(f"[ToolWatcher] Error loading {filepath}: {e}")

async def start_tool_watcher():
    tools_path = Path(settings.tools_library_path)
    tools_path.mkdir(parents=True, exist_ok=True)

    handler = ToolFileHandler(tool_registry)
    observer = Observer()
    observer.schedule(handler, str(tools_path), recursive=True)
    observer.start()

    for py_file in tools_path.rglob("*.py"):
        if not py_file.name.startswith("_"):
            handler._load_file(str(py_file))

    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        observer.stop()
    observer.join()
