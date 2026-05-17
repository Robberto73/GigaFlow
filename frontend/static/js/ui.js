// ===== UI UTILITIES =====
// ===== TERMINAL =====
const terminalOverlay = document.getElementById('terminal-overlay');
const terminalBody = document.getElementById('terminal-body');
const terminalStatus = document.getElementById('terminal-status');
const terminalClose = document.getElementById('terminal-close');
const terminalClear = document.getElementById('terminal-clear');

function showTerminal() {
    terminalOverlay.classList.add('active');
    terminalBody.innerHTML = '';
    terminalStatus.textContent = 'Running...';
    terminalStatus.className = 'terminal-status running';
}

function hideTerminal() {
    terminalOverlay.classList.remove('active');
}

function termLog(text, type = 'output') {
    const line = document.createElement('div');
    line.className = 'terminal-line ' + type;
    line.textContent = text;
    terminalBody.appendChild(line);
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

function termSetStatus(text, type = 'info') {
    terminalStatus.textContent = text;
    terminalStatus.className = 'terminal-status ' + type;
}

terminalClose.addEventListener('click', hideTerminal);
terminalClear.addEventListener('click', () => { terminalBody.innerHTML = ''; });
terminalOverlay.addEventListener('click', (e) => {
    if (e.target === terminalOverlay) hideTerminal();
});


// Custom toast notifications
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '!' : 'ℹ'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function switchView(name) {
    state.currentView = name;
    navItems.forEach(n => n.classList.toggle('active', n.dataset.view === name));
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[name].classList.add('active');
    if (name === 'tools') loadTools();
    if (name === 'pipelines') loadPipelines();
    if (name === 'rag') loadRagStats();
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewName = item.dataset.view;
        if (viewName) switchView(viewName);
    });
});

// Confirm dialog in project style
function showConfirm(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-dialog">
            <p>${message}</p>
            <div class="confirm-actions">
                <button class="btn-secondary" id="confirm-cancel">Cancel</button>
                <button class="btn-primary" id="confirm-ok">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    });
    overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });
}
