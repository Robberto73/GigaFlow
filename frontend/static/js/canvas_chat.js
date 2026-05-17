// ===== CANVAS CHAT / ARCHITECT =====
const canvasChatMessages = document.getElementById('canvas-chat-messages');
const canvasChatInput = document.getElementById('canvas-chat-input');
const canvasChatSend = document.getElementById('canvas-chat-send');
const canvasChatClear = document.getElementById('canvas-chat-clear');

let canvasChatHistory = [];

function addCanvasChatMessage(role, content) {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    const avatar = role === 'user' ? 'You' : 'AI';
    msg.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${formatMessage(content)}</div>
    `;
    canvasChatMessages.appendChild(msg);
    canvasChatMessages.scrollTop = canvasChatMessages.scrollHeight;
}

async function sendCanvasChatMessage() {
    const text = canvasChatInput.value.trim();
    if (!text) return;

    canvasChatInput.value = '';
    canvasChatInput.style.height = 'auto';
    addCanvasChatMessage('user', text);

    const messages = [
        ...canvasChatHistory,
        { role: 'user', content: text }
    ];

    const loadingId = 'canvas-loading-' + Date.now();
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'message assistant';
    loadingMsg.id = loadingId;
    loadingMsg.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><em>Architecting...</em></div>`;
    canvasChatMessages.appendChild(loadingMsg);
    canvasChatMessages.scrollTop = canvasChatMessages.scrollHeight;

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, mode: 'canvas_architect', stream: false })
        });
        const data = await response.json();

        loadingMsg.remove();

        // Try to parse JSON response
        let result = data.response || '';
        let parsed = null;
        let messageText = result;

        // Extract JSON from markdown code block or raw JSON
        const jsonMatch = result.match(/```json\s*([\s\S]*?)```/) || result.match(/```\s*([\s\S]*?)```/) || result.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                messageText = parsed.message || result;
            } catch(e) {
                // Try parsing the whole response
                try { parsed = JSON.parse(result); messageText = parsed.message || result; } catch(e2) {}
            }
        }

        addCanvasChatMessage('assistant', messageText);

        // Execute commands
        if (parsed && parsed.commands && Array.isArray(parsed.commands)) {
            executeArchitectCommands(parsed.commands);
        }

        canvasChatHistory.push({ role: 'user', content: text });
        canvasChatHistory.push({ role: 'assistant', content: result });

        // Keep history manageable
        if (canvasChatHistory.length > 20) canvasChatHistory = canvasChatHistory.slice(-20);

    } catch (e) {
        loadingMsg.remove();
        addCanvasChatMessage('assistant', 'Error: ' + e.message);
    }
}

canvasChatSend.addEventListener('click', sendCanvasChatMessage);
canvasChatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendCanvasChatMessage();
    }
});
canvasChatInput.addEventListener('input', () => {
    canvasChatInput.style.height = 'auto';
    canvasChatInput.style.height = canvasChatInput.scrollHeight + 'px';
});

canvasChatClear.addEventListener('click', () => {
    canvasChatMessages.innerHTML = '';
    canvasChatHistory = [];
    showToast('Canvas chat cleared', 'info');
});

// ===== COMMAND EXECUTION =====
function executeArchitectCommands(commands) {
    let createdCount = 0;
    let connectedCount = 0;

    commands.forEach(cmd => {
        switch(cmd.cmd) {
            case 'create_node':
                const node = createNode(cmd.type, cmd.x || 100, cmd.y || 100);
                if (node) {
                    if (cmd.config) {
                        Object.assign(node.config, cmd.config);
                    }
                    if (cmd.is_stub) {
                        node.config._isStub = true;
                        node.config._stubDesc = cmd.stub_desc || 'Stub node — needs implementation';
                        makeNodeStub(node);
                    }
                    createdCount++;
                }
                break;
            case 'connect':
                if (cmd.source && cmd.target) {
                    addEdge(cmd.source, cmd.target);
                    connectedCount++;
                }
                break;
            case 'delete_node':
                const delNode = state.nodes.find(n => n.id === cmd.id);
                if (delNode) {
                    state.selectedNode = delNode;
                    deleteSelectedNode();
                }
                break;
            case 'update_config':
                const updNode = state.nodes.find(n => n.id === cmd.id);
                if (updNode && cmd.config) {
                    Object.assign(updNode.config, cmd.config);
                    const el = document.getElementById(updNode.id);
                    if (el) el.querySelector('.node-body').textContent = getNodePreview(updNode);
                }
                break;
            case 'set_position':
                const posNode = state.nodes.find(n => n.id === cmd.id);
                if (posNode) {
                    posNode.x = cmd.x || posNode.x;
                    posNode.y = cmd.y || posNode.y;
                    updateNodePosition(posNode);
                }
                break;
            case 'clear_canvas':
                state.nodes = [];
                state.edges = [];
                canvasNodes.innerHTML = '';
                renderEdges();
                configPanel.classList.remove('active');
                break;
        }
    });

    if (createdCount > 0 || connectedCount > 0) {
        showToast(`Created ${createdCount} nodes, ${connectedCount} connections`, 'success');
    }
}

function makeNodeStub(node) {
    const el = document.getElementById(node.id);
    if (!el) return;
    el.classList.add('stub');

    // Add stub badge to header
    const header = el.querySelector('.node-header');
    if (header && !header.querySelector('.stub-badge')) {
        const badge = document.createElement('span');
        badge.className = 'stub-badge';
        badge.textContent = 'stub';
        header.appendChild(badge);
    }

    // Update body
    const body = el.querySelector('.node-body');
    if (body) body.textContent = node.config._stubDesc;
}

function unmakeNodeStub(node) {
    const el = document.getElementById(node.id);
    if (!el) return;
    el.classList.remove('stub');
    const badge = el.querySelector('.stub-badge');
    if (badge) badge.remove();
    node.config._isStub = false;
    const body = el.querySelector('.node-body');
    if (body) body.textContent = getNodePreview(node);
}
