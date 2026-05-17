// ===== TOUR / HELP GUIDE =====

let tourOverlay, tourSpotlight, tourCard, tourStep, tourTitle, tourDesc, tourNext, tourPrev, tourSkip, tourClose;

function initTour() {
    tourOverlay = document.getElementById('tour-overlay');
    tourSpotlight = document.getElementById('tour-spotlight');
    tourCard = document.getElementById('tour-card');
    tourStep = document.getElementById('tour-step');
    tourTitle = document.getElementById('tour-title');
    tourDesc = document.getElementById('tour-desc');
    tourNext = document.getElementById('tour-next');
    tourPrev = document.getElementById('tour-prev');
    tourSkip = document.getElementById('tour-skip');
    tourClose = document.getElementById('tour-close');

    // Attach listeners only if elements exist
    if (tourNext) tourNext.addEventListener('click', () => showTourStep(currentTourStep + 1));
    if (tourPrev) tourPrev.addEventListener('click', () => showTourStep(currentTourStep - 1));
    if (tourSkip) tourSkip.addEventListener('click', endTour);
    if (tourClose) tourClose.addEventListener('click', endTour);

    const startBtn = document.getElementById('tour-start-btn');
    if (startBtn) startBtn.addEventListener('click', startTour);

    // Auto-start after a short delay
    setTimeout(maybeStartTour, 800);
}

const tourSteps = [
    { target: '.sidebar-header', title: 'Welcome to GigaFlow', desc: 'GigaFlow is a visual pipeline builder for AI agents. Connect nodes to create automation workflows using GigaChat or local LLMs.', position: 'right' },
    { target: '.sidebar-nav', title: 'Navigation', desc: 'Switch between views: Canvas, Chat, Tools, RAG, and Pipelines.', position: 'right' },
    { target: '.status-section', title: 'Connection Status', desc: 'Monitor connections in real-time. Green = online, Red = offline. Click "Test Connections" to verify.', position: 'right' },
    { target: '.canvas-toolbar', title: 'Toolbar', desc: 'Add nodes: Input, Agent, Tool, Judge, Loop, Condition, RAG, Output.', position: 'bottom' },
    { target: '#canvas-container', title: 'Canvas', desc: 'Drag nodes, connect via ports, right-click for options.', position: 'center' },
    { target: '#trash-bin', title: 'Trash Bin', desc: 'Drag nodes here to delete. Or press Delete key.', position: 'left' },
    { target: '#config-panel', title: 'Configuration', desc: 'Click any node to configure it. Each type has unique parameters.', position: 'left' },
    { target: '#chat-view .chat-input-wrapper', title: 'Chat', desc: 'Talk to AI. Attach files with the paperclip button.', position: 'top' },
    { target: '#tools-view .tools-editor', title: 'Create Tools', desc: 'Write Python tools with @gigaflow_tool decorator.', position: 'left' },
    { target: '#rag-view .rag-upload', title: 'RAG Documents', desc: 'Upload documents for semantic search with BGE-M3.', position: 'left' }
];

let currentTourStep = 0;

function startTour() {
    currentTourStep = 0;
    if (tourOverlay) tourOverlay.classList.add('active');
    showTourStep(0);
}

function showTourStep(idx) {
    if (idx < 0 || idx >= tourSteps.length) { endTour(); return; }
    currentTourStep = idx;
    const step = tourSteps[idx];
    const target = document.querySelector(step.target);

    if (tourStep) tourStep.textContent = (idx + 1) + ' / ' + tourSteps.length;
    if (tourTitle) tourTitle.textContent = step.title;
    if (tourDesc) tourDesc.textContent = step.desc;
    if (tourPrev) tourPrev.style.display = idx === 0 ? 'none' : 'inline-flex';
    if (tourNext) tourNext.textContent = idx === tourSteps.length - 1 ? 'Finish' : 'Next';

    if (target && tourSpotlight && tourCard) {
        const rect = target.getBoundingClientRect();
        const pad = 8;
        tourSpotlight.style.left = (rect.left - pad) + 'px';
        tourSpotlight.style.top = (rect.top - pad) + 'px';
        tourSpotlight.style.width = (rect.width + pad * 2) + 'px';
        tourSpotlight.style.height = (rect.height + pad * 2) + 'px';

        let cardLeft = rect.right + 20, cardTop = rect.top;
        if (step.position === 'left') { cardLeft = rect.left - 360; cardTop = rect.top; }
        else if (step.position === 'bottom') { cardLeft = rect.left; cardTop = rect.bottom + 20; }
        else if (step.position === 'top') { cardLeft = rect.left; cardTop = rect.top - 200; }
        else if (step.position === 'center') { cardLeft = window.innerWidth / 2 - 170; cardTop = window.innerHeight / 2 - 100; }

        cardLeft = Math.max(10, Math.min(cardLeft, window.innerWidth - 360));
        cardTop = Math.max(10, Math.min(cardTop, window.innerHeight - 250));
        tourCard.style.left = cardLeft + 'px';
        tourCard.style.top = cardTop + 'px';
    } else {
        if (tourSpotlight) {
            tourSpotlight.style.width = '0px';
            tourSpotlight.style.height = '0px';
        }
        if (tourCard) {
            tourCard.style.left = (window.innerWidth / 2 - 170) + 'px';
            tourCard.style.top = (window.innerHeight / 2 - 100) + 'px';
        }
    }
}

function endTour() {
    if (tourOverlay) tourOverlay.classList.remove('active');
    localStorage.setItem('gigaflow_tour_seen', 'true');
}

function maybeStartTour() {
    if (!localStorage.getItem('gigaflow_tour_seen')) startTour();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTour);
} else {
    initTour();
}