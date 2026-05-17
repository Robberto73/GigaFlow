// ===== UI UTILITIES =====

// ===== TERMINAL =====
const terminalOverlay = document.getElementById('terminal-overlay');
const terminalBody = document.getElementById('terminal-body');
const terminalStatus = document.getElementById('terminal-status');
const terminalClose = document.getElementById('terminal-close');
const terminalClear = document.getElementById('terminal-clear');

function showTerminal() {
    if (!terminalOverlay) return;
    terminalOverlay.classList.add('active');
    if (terminalBody) terminalBody.innerHTML = '';
    if (terminalStatus) {
        terminalStatus.textContent = 'Running...';
        terminalStatus.className = 'terminal-status running';
    }
}

function hideTerminal() {
    if (terminalOverlay) terminalOverlay.classList.remove('active');
}

function termLog(text, type = 'output') {
    if (!terminalBody) return;
    const line = document.createElement('div');
    line.className = 'terminal-line ' + type;
    line.textContent = text;
    terminalBody.appendChild(line);
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

function termSetStatus(text, type = 'info') {
    if (!terminalStatus) return;
    terminalStatus.textContent = text;
    terminalStatus.className = 'terminal-status ' + type;
}

if (terminalClose) {
    terminalClose.addEventListener('click', hideTerminal);
}
if (terminalClear) {
    terminalClear.addEventListener('click', () => { if (terminalBody) terminalBody.innerHTML = ''; });
}
if (terminalOverlay) {
    terminalOverlay.addEventListener('click', (e) => {
        if (e.target === terminalOverlay) hideTerminal();
    });
}


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
    // Guard: ensure globals exist (defined in app.js)
    if (typeof state === 'undefined' || typeof views === 'undefined' || typeof navItems === 'undefined') {
        console.warn('switchView called before app.js initialized');
        return;
    }
    state.currentView = name;
    navItems.forEach(n => n.classList.toggle('active', n.dataset.view === name));
    Object.values(views).forEach(v => v.classList.remove('active'));
    if (views[name]) views[name].classList.add('active');
    if (name === 'tools' && typeof loadTools === 'function') loadTools();
    if (name === 'pipelines' && typeof loadPipelines === 'function') loadPipelines();
    if (name === 'rag' && typeof loadRagStats === 'function') loadRagStats();
}

// Safe nav initialization — runs after DOM ready but checks for globals
function initNav() {
    if (typeof navItems === 'undefined') {
        console.warn('navItems not defined yet, retrying...');
        setTimeout(initNav, 50);
        return;
    }
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            if (viewName) switchView(viewName);
        });
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
} else {
    initNav();
}

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