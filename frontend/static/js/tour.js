// ===== TOUR / HELP GUIDE =====
const tourOverlay = document.getElementById('tour-overlay');
const tourSpotlight = document.getElementById('tour-spotlight');
const tourCard = document.getElementById('tour-card');
const tourStep = document.getElementById('tour-step');
const tourTitle = document.getElementById('tour-title');
const tourDesc = document.getElementById('tour-desc');
const tourNext = document.getElementById('tour-next');
const tourPrev = document.getElementById('tour-prev');
const tourSkip = document.getElementById('tour-skip');
const tourClose = document.getElementById('tour-close');

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
    tourOverlay.classList.add('active');
    showTourStep(0);
}

function showTourStep(idx) {
    if (idx < 0 || idx >= tourSteps.length) { endTour(); return; }
    currentTourStep = idx;
    const step = tourSteps[idx];
    const target = document.querySelector(step.target);

    tourStep.textContent = (idx + 1) + ' / ' + tourSteps.length;
    tourTitle.textContent = step.title;
    tourDesc.textContent = step.desc;
    tourPrev.style.display = idx === 0 ? 'none' : 'inline-flex';
    tourNext.textContent = idx === tourSteps.length - 1 ? 'Finish' : 'Next';

    if (target) {
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
        tourSpotlight.style.width = '0px'; tourSpotlight.style.height = '0px';
        tourCard.style.left = (window.innerWidth / 2 - 170) + 'px';
        tourCard.style.top = (window.innerHeight / 2 - 100) + 'px';
    }
}

function endTour() {
    tourOverlay.classList.remove('active');
    localStorage.setItem('gigaflow_tour_seen', 'true');
}

tourNext.addEventListener('click', () => showTourStep(currentTourStep + 1));
tourPrev.addEventListener('click', () => showTourStep(currentTourStep - 1));
tourSkip.addEventListener('click', endTour);
tourClose.addEventListener('click', endTour);

function maybeStartTour() {
    if (!localStorage.getItem('gigaflow_tour_seen')) setTimeout(startTour, 800);
}

document.getElementById('tour-start-btn').addEventListener('click', startTour);
