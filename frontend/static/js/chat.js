// ===== CHAT =====
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

function addChatMessage(role, content) {
    const msg = document.createElement('div');
    msg.className = `message ${role}`;
    const avatar = role === 'user' ? 'You' : 'AI';
    msg.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${formatMessage(content)}</div>
    `;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMessage(text) {
    if (!text) return '';
    text = escapeHtml(text);

    text = text.replace(/```([\s\S]*?)```/g, function(match, code) {
        return '<pre><code>' + code.trim() + '</code></pre>';
    });
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/___(.*?)___/g, '<strong><em>$1</em></strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    text = text.replace(/^&gt; (.*$)/gim, '<blockquote>$1</blockquote>');
    text = text.replace(/^\* (.*$)/gim, '<li>$1</li>');
    text = text.replace(/^- (.*$)/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, function(match) { return '<ul>' + match + '</ul>'; });
    text = text.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    text = text.replace(/^---$/gim, '<hr>');
    text = text.replace(/^\*\*\*$/gim, '<hr>');
    text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/<\/li><br>/g, '</li>');
    text = text.replace(/<br><ul>/g, '<ul>');
    text = text.replace(/<\/ul><br>/g, '</ul>');

    return text;
}

let projectContext = '';

async function loadProjectContext() {
    try {
        const res = await fetch(`${API_BASE}/memory`);
        const data = await res.json();
        projectContext = [
            `Project: ${data.project_name || 'GigaFlow'}`,
            `Description: ${data.description || ''}`,
            `Available tools: ${(data.available_tools || []).map(t => t.name).join(', ')}`,
            `Tool requirements: ${data.tool_requirements || ''}`,
            `Pipeline patterns: ${data.pipeline_patterns || ''}`,
            `Custom notes: ${data.custom_notes || ''}`
        ].join('\n');
    } catch(e) {}
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';
    addChatMessage('user', text);

    // Build messages with project context as system prompt
    const messages = [];
    if (projectContext) {
        messages.push({ role: 'system', content: projectContext });
    }
    messages.push(...state.chatHistory);
    messages.push({ role: 'user', content: text });

    const loadingId = 'loading-' + Date.now();
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'message assistant';
    loadingMsg.id = loadingId;
    loadingMsg.innerHTML = `<div class="message-avatar">AI</div><div class="message-content"><em>Thinking...</em></div>`;
    chatMessages.appendChild(loadingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages, stream: false })
        });
        const data = await response.json();

        loadingMsg.remove();
        addChatMessage('assistant', data.response);
        state.chatHistory.push({ role: 'user', content: text });
        state.chatHistory.push({ role: 'assistant', content: data.response });
    } catch (e) {
        loadingMsg.remove();
        addChatMessage('assistant', 'Error: ' + e.message);
    }
}

sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
});
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
});

document.getElementById('attach-file-btn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch(`${API_BASE}/rag/upload`, { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();

        const readRes = await fetch(`${API_BASE}/files/read`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: 'uploads/' + file.name })
        });
        const readData = await readRes.json();

        addChatMessage('user', '[Attached file: ' + file.name + ']\n\nFile content (first 2000 chars):\n' + (readData.content ? readData.content.substring(0, 2000) : ''));
    };
    input.click();
});
