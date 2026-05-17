// ===== TOOLS =====
const TOOL_EXAMPLE_CODE = `def gigaflow_tool(description="", parameters=None, tool_type="generic"):
    def decorator(func):
        func._is_gigaflow_tool = True
        func.description = description
        func.parameters = parameters or {}
        func.tool_type = tool_type
        return func
    return decorator

@gigaflow_tool(
    description="Summarize text to specified word count",
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
    return " ".join(words[:max_words]) + "..."`;

async function loadTools() {
    try {
        const res = await fetch(`${API_BASE}/tools`);
        state.tools = await res.json();
        renderToolsList();
        // Sync tools to project memory
        await fetch(`${API_BASE}/memory/tools`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tools: state.tools.map(t => ({ name: t.name, description: t.description, type: t.type })) })
        });
    } catch(e) { console.error('Failed to load tools', e); }
}

function renderToolsList() {
    const list = document.getElementById('tools-list');
    if (state.tools.length === 0) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;">No tools yet. Create your first tool below.</div>';
        return;
    }
    list.innerHTML = state.tools.map(t => `
        <div class="tool-item" onclick="loadToolToEditor('${t.name}')">
            <div class="tool-item-name">${t.name}</div>
            <div class="tool-item-desc">${t.description || 'No description'}</div>
        </div>
    `).join('');
}

function loadToolToEditor(name) {
    const tool = state.tools.find(t => t.name === name);
    if (!tool) return;
    document.getElementById('tool-name').value = name;
}

document.getElementById('validate-tool-btn').addEventListener('click', async () => {
    const code = document.getElementById('tool-code').value;
    const res = await fetch(`${API_BASE}/tools/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });
    const data = await res.json();
    showValidation(data);
});

document.getElementById('save-tool-btn').addEventListener('click', async () => {
    const name = document.getElementById('tool-name').value.trim();
    const code = document.getElementById('tool-code').value;
    if (!name || !code) return showToast('Name and code required', 'warning');
    if (code === TOOL_EXAMPLE_CODE) return showToast('Please modify the example code before saving', 'warning');

    const res = await fetch(`${API_BASE}/tools/create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code })
    });
    const data = await res.json();
    showValidation(data.validation);
    if (data.success) {
        showToast('Tool saved!', 'success');
        loadTools();
    }
});

function showValidation(data) {
    const el = document.getElementById('validation-result');
    el.classList.add('show');
    el.className = 'validation-result show ' + (data.valid ? 'valid' : 'invalid');
    el.innerHTML = `
        <strong>${data.valid ? 'Valid' : 'Invalid'}</strong><br>
        ${data.errors?.length ? '<b>Errors:</b> ' + data.errors.join(', ') + '<br>' : ''}
        ${data.warnings?.length ? '<b>Warnings:</b> ' + data.warnings.join(', ') + '<br>' : ''}
        ${data.suggestions?.length ? '<b>Suggestions:</b> ' + data.suggestions.join(', ') : ''}
    `;
}
