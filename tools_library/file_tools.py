# File system tools for GigaFlow agents
# These allow agents to read folders, generate UI, save code

from pathlib import Path
from typing import List, Dict, Any
import json

def gigaflow_tool(description="", parameters=None, tool_type="generic"):
    def decorator(func):
        func._is_gigaflow_tool = True
        func.description = description
        func.parameters = parameters or {}
        func.tool_type = tool_type
        return func
    return decorator

@gigaflow_tool(
    description="List all files in a directory recursively",
    parameters={
        "path": {"type": "string", "description": "Directory path", "default": "."},
        "max_depth": {"type": "integer", "description": "Max recursion depth", "default": 3}
    },
    tool_type="filesystem"
)
def list_directory(path: str = ".", max_depth: int = 3) -> str:
    root = Path(path)
    if not root.exists():
        return json.dumps({"error": f"Path '{path}' not found"}, ensure_ascii=False)

    files = []
    def scan(p, depth):
        if depth > max_depth:
            return
        try:
            for item in p.iterdir():
                rel = str(item.relative_to(root))
                if item.is_file():
                    files.append({"path": rel, "size": item.stat().st_size, "type": "file"})
                elif item.is_dir():
                    files.append({"path": rel, "type": "directory"})
                    scan(item, depth + 1)
        except PermissionError:
            pass

    scan(root, 1)
    return json.dumps(files, ensure_ascii=False, indent=2)

@gigaflow_tool(
    description="Read text content of a file",
    parameters={
        "path": {"type": "string", "description": "File path"},
        "limit": {"type": "integer", "description": "Max chars to read", "default": 10000}
    },
    tool_type="filesystem"
)
def read_file(path: str, limit: int = 10000) -> str:
    p = Path(path)
    if not p.exists():
        return f"Error: file '{path}' not found"
    try:
        with open(p, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read(limit)
        return content
    except Exception as e:
        return f"Error reading file: {e}"

@gigaflow_tool(
    description="Save text content to a file (creates dirs if needed)",
    parameters={
        "path": {"type": "string", "description": "File path to save"},
        "content": {"type": "string", "description": "Content to write"}
    },
    tool_type="filesystem"
)
def save_file(path: str, content: str) -> str:
    try:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        return f"Saved to {path} ({len(content)} chars)"
    except Exception as e:
        return f"Error saving file: {e}"

@gigaflow_tool(
    description="Generate UI description from folder contents for agent to build interface",
    parameters={
        "folder_path": {"type": "string", "description": "Folder to scan"},
        "file_types": {"type": "string", "description": "Comma-separated extensions to include", "default": ".py,.js,.ts,.html,.css,.md,.txt"}
    },
    tool_type="ui"
)
def analyze_folder_for_ui(folder_path: str, file_types: str = ".py,.js,.ts,.html,.css,.md,.txt") -> str:
    root = Path(folder_path)
    if not root.exists():
        return json.dumps({"error": "Folder not found"}, ensure_ascii=False)

    extensions = [e.strip().lower() for e in file_types.split(",")]
    summary = []

    for f in root.rglob("*"):
        if f.is_file() and any(str(f).lower().endswith(ext) for ext in extensions):
            try:
                content = f.read_text(encoding="utf-8", errors="ignore")[:3000]
                summary.append({
                    "file": str(f.relative_to(root)),
                    "size": f.stat().st_size,
                    "preview": content[:500]
                })
            except:
                pass

    result = {
        "folder": str(root),
        "files_found": len(summary),
        "files": summary,
        "suggestion": "Use save_file() to write generated HTML/JS/CSS based on this structure"
    }
    return json.dumps(result, ensure_ascii=False, indent=2)

@gigaflow_tool(
    description="Run a saved pipeline by ID",
    parameters={
        "pipeline_id": {"type": "string", "description": "Pipeline ID to run"},
        "input": {"type": "string", "description": "Initial input text", "default": ""}
    },
    tool_type="pipeline"
)
def run_pipeline_tool(pipeline_id: str, input: str = "") -> str:
    # This is a synchronous wrapper; in real use the agent would call the API
    return f"Pipeline '{pipeline_id}' queued with input: {input[:100]}"
