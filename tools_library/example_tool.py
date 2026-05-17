# Example tools for GigaFlow
# Copy the decorator below into every tool file you create

def gigaflow_tool(description="", parameters=None, tool_type="generic"):
    def decorator(func):
        func._is_gigaflow_tool = True
        func.description = description
        func.parameters = parameters or {}
        func.tool_type = tool_type
        return func
    return decorator

@gigaflow_tool(
    description="Summarize text to specified length",
    parameters={
        "text": {"type": "string", "description": "Text to summarize"},
        "max_words": {"type": "integer", "description": "Maximum words", "default": 100}
    },
    tool_type="text"
)
def summarize(text: str, max_words: int = 100) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."

@gigaflow_tool(
    description="Count words in text",
    parameters={"text": {"type": "string"}},
    tool_type="analytics"
)
def word_count(text: str) -> int:
    return len(text.split())

@gigaflow_tool(
    description="Pretty-print JSON string",
    parameters={"json_str": {"type": "string"}},
    tool_type="data"
)
def pretty_json(json_str: str) -> str:
    import json
    try:
        data = json.loads(json_str)
        return json.dumps(data, ensure_ascii=False, indent=2)
    except:
        return "Invalid JSON"
