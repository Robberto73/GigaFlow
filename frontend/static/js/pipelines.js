// ===== PIPELINES =====
async function loadPipelines() {
    try {
        const res = await fetch(`${API_BASE}/pipelines`);
        const data = await res.json();
        const grid = document.getElementById('pipelines-grid');
        grid.innerHTML = data.map(p => `
            <div class="pipeline-card" onclick="loadPipeline('${p.id}')">
                <h4>${p.name}</h4>
                <p>ID: ${p.id}</p>
                <div class="meta"><span>Click to load</span></div>
            </div>
        `).join('');
    } catch(e) {}
}

function loadPipeline(id) {
    showToast('Loading pipeline: ' + id, 'info');
    switchView('canvas');
}
