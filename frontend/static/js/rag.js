// ===== RAG =====
const dropZone = document.getElementById('drop-zone');
const ragFileInput = document.getElementById('rag-file-input');

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
ragFileInput.addEventListener('change', (e) => handleFiles(e.target.files));

async function handleFiles(files) {
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/rag/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        showToast('Uploaded ' + file.name + ': ' + data.chunks + ' chunks indexed', 'success');
    }
    loadRagStats();
}

document.getElementById('rag-search-btn').addEventListener('click', async () => {
    const query = document.getElementById('rag-query').value.trim();
    if (!query) return;

    const res = await fetch(`${API_BASE}/rag/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, k: 5 })
    });
    const data = await res.json();

    const container = document.getElementById('rag-results');
    container.innerHTML = data.results.map(r => `
        <div class="rag-result-item">
            <div>${(r.content || '').substring(0, 300)}...</div>
            <div class="score">Score: ${(r.score || 0).toFixed(3)} | Source: ${r.metadata?.source || 'unknown'}</div>
        </div>
    `).join('');
});

async function loadRagStats() {
    try {
        const res = await fetch(`${API_BASE}/rag/stats`);
        const data = await res.json();
        const grid = document.getElementById('rag-stats');
        grid.innerHTML = `
            <div class="stat-card"><div class="stat-value">${data.documents_count}</div><div class="stat-label">Documents</div></div>
            <div class="stat-card"><div class="stat-value">${data.index_exists ? 'Yes' : 'No'}</div><div class="stat-label">Index Ready</div></div>
            <div class="stat-card"><div class="stat-value">${data.model_loaded ? 'Yes' : 'No'}</div><div class="stat-label">Model Loaded</div></div>
            <div class="stat-card"><div class="stat-value">BGE-M3</div><div class="stat-label">Embedding</div></div>
        `;
    } catch(e) {}
}
