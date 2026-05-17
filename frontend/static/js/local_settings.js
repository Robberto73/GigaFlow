// ===== LOCAL MODEL SETTINGS =====
const localSettings = {
    port: 5000,
    maxConcurrent: 4,
};

function initLocalSettings() {
    const section = document.querySelector('.status-section');
    if (!section) return;

    const settingsDiv = document.createElement('div');
    settingsDiv.className = 'local-settings';
    settingsDiv.innerHTML = `
        <div class="sidebar-label" style="margin-top:12px">Local Model Settings</div>
        <div class="form-group">
            <label>API Port</label>
            <input type="number" id="local-port" value="${localSettings.port}" min="1" max="65535" style="width:100%">
        </div>
        <div class="form-group">
            <label>Max Concurrent Requests</label>
            <input type="number" id="local-concurrent" value="${localSettings.maxConcurrent}" min="1" max="200" style="width:100%">
        </div>
        <button class="btn-test-provider" id="save-local-settings" style="margin-top:4px">Apply Settings</button>
    `;
    section.appendChild(settingsDiv);

    document.getElementById('save-local-settings').addEventListener('click', async () => {
        const port = parseInt(document.getElementById('local-port').value) || 5000;
        const concurrent = parseInt(document.getElementById('local-concurrent').value) || 1;
        localSettings.port = Math.max(1, Math.min(65535, port));
        localSettings.maxConcurrent = Math.max(1, Math.min(200, concurrent));

        // Update backend via API
        try {
            await fetch(`${API_BASE}/llm/provider`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: 'local_openai', port: localSettings.port, max_concurrent: localSettings.maxConcurrent })
            });
            showToast('Local model settings updated', 'success');
            testConnections();
        } catch(e) {
            showToast('Failed to update settings', 'error');
        }
    });
}
