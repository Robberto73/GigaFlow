// ===== CONNECTION STATUS =====
const dotGigachat = document.getElementById('dot-gigachat');
const textGigachat = document.getElementById('text-gigachat');
const dotLocal = document.getElementById('dot-local');
const textLocal = document.getElementById('text-local');
const dotRag = document.getElementById('dot-rag');
const textRag = document.getElementById('text-rag');
const testProviderBtn = document.getElementById('test-provider-btn');

let ragAvailable = false;

async function testConnections() {
    [dotGigachat, dotLocal, dotRag].forEach(d => d.className = 'status-dot');
    textGigachat.textContent = 'Testing...';
    textLocal.textContent = 'Testing...';
    textRag.textContent = 'Testing...';

    try {
        const llmRes = await fetch(`${API_BASE}/llm/test`);
        const llmData = await llmRes.json();

        if (llmData.gigachat?.status === 'connected') {
            dotGigachat.className = 'status-dot connected';
            textGigachat.textContent = llmData.gigachat.model || 'OK';
        } else {
            dotGigachat.className = 'status-dot error';
            textGigachat.textContent = (llmData.gigachat?.error || 'Offline').substring(0, 30);
        }

        if (llmData.local_openai?.status === 'connected') {
            dotLocal.className = 'status-dot connected';
            const models = llmData.local_openai.models || [];
            textLocal.textContent = models[0] || 'OK';
        } else {
            dotLocal.className = 'status-dot error';
            textLocal.textContent = (llmData.local_openai?.error || 'Offline').substring(0, 30);
        }
    } catch(e) {
        dotGigachat.className = 'status-dot error'; textGigachat.textContent = 'No response';
        dotLocal.className = 'status-dot error'; textLocal.textContent = 'No response';
    }

    try {
        const ragRes = await fetch(`${API_BASE}/rag/stats`);
        const ragData = await ragRes.json();
        if (ragData.model_loaded) {
            dotRag.className = 'status-dot connected';
            textRag.textContent = ragData.documents_count + ' docs';
            ragAvailable = true;
        } else {
            dotRag.className = 'status-dot error';
            textRag.textContent = 'Model missing';
            ragAvailable = false;
        }
    } catch(e) {
        dotRag.className = 'status-dot error'; textRag.textContent = 'Offline'; ragAvailable = false;
    }
    updateRagAvailability();
}

function updateRagAvailability() {
    const ragCheckbox = document.getElementById('cfg-use_rag');
    if (ragCheckbox) { ragCheckbox.disabled = !ragAvailable; if (!ragAvailable) ragCheckbox.checked = false; }
    const ragBtn = document.getElementById('add-rag-btn');
    if (ragBtn) {
        ragBtn.disabled = !ragAvailable;
        ragBtn.style.opacity = ragAvailable ? '1' : '0.4';
        ragBtn.title = ragAvailable ? 'Add RAG' : 'RAG unavailable — model not loaded';
    }
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) dropZone.classList.toggle('rag-disabled', !ragAvailable);
}

testProviderBtn.addEventListener('click', testConnections);
