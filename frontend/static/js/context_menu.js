const contextMenu = document.getElementById('context-menu');
const colorPicker = document.getElementById('color-picker');
const trashBin = document.getElementById('trash-bin');
let contextTarget = null;
let contextType = null;

function showContextMenu(x, y, target, type) {
    if (!contextMenu) return;
    contextTarget = target;
    contextType = type;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('active');
    if (colorPicker) colorPicker.classList.remove('active');
}

function hideContextMenu() {
    if (contextMenu) contextMenu.classList.remove('active');
    if (colorPicker) colorPicker.classList.remove('active');
    contextTarget = null;
    contextType = null;
}

document.addEventListener('click', (e) => {
    if (!contextMenu || !colorPicker) return;
    if (!contextMenu.contains(e.target) && !colorPicker.contains(e.target)) hideContextMenu();
});

if (contextMenu) {
    contextMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.context-item');
        if (!item) return;
        const action = item.dataset.action;

        if (action === 'delete') {
            if (contextType === 'node' && contextTarget) {
                if (typeof state !== 'undefined') state.selectedNode = contextTarget;
                if (typeof deleteSelectedNode === 'function') deleteSelectedNode();
            } else if (contextType === 'edge' && contextTarget) {
                if (typeof state !== 'undefined') state.selectedEdge = contextTarget;
                if (typeof deleteSelectedEdge === 'function') deleteSelectedEdge();
            }
        } else if (action === 'rename') {
            if (contextType === 'node' && contextTarget) {
                const defaultName = (typeof NODE_TYPES !== 'undefined' && NODE_TYPES[contextTarget.type])
                    ? NODE_TYPES[contextTarget.type].label
                    : 'Node';
                const newName = prompt('Rename node:', defaultName);
                if (newName) {
                    contextTarget.config = contextTarget.config || {};
                    contextTarget.config._customName = newName;
                    const el = document.getElementById(contextTarget.id);
                    if (el) {
                        const span = el.querySelector('.node-header span');
                        if (span) span.textContent = newName;
                    }
                }
            }
        } else if (action === 'color') {
            if (!colorPicker) return;
            const rect = item.getBoundingClientRect();
            colorPicker.style.left = rect.right + 8 + 'px';
            colorPicker.style.top = rect.top + 'px';
            colorPicker.classList.add('active');
            // Don't hide context menu immediately so color picker is visible
            return;
        }
        hideContextMenu();
    });
}

if (colorPicker) {
    colorPicker.addEventListener('click', (e) => {
        const opt = e.target.closest('.color-option');
        if (!opt || !contextTarget || contextType !== 'node') return;
        const color = opt.dataset.color;
        const el = document.getElementById(contextTarget.id);
        if (el) {
            el.className = el.className.replace(/node-color-\w+/g, '').trim();
            if (color) {
                const colorName = { '#ef4444': 'red', '#f59e0b': 'orange', '#22c55e': 'green',
                    '#3b82f6': 'blue', '#a855f7': 'purple', '#ec4899': 'pink', '#06b6d4': 'cyan' }[color];
                if (colorName) el.classList.add('node-color-' + colorName);
            }
            contextTarget.config = contextTarget.config || {};
            contextTarget.config._color = color;
        }
        colorPicker.classList.remove('active');
        hideContextMenu();
    });
}

if (trashBin) {
    trashBin.addEventListener('dragover', (e) => { e.preventDefault(); trashBin.classList.add('drag-over'); });
    trashBin.addEventListener('dragleave', () => trashBin.classList.remove('drag-over'));
    trashBin.addEventListener('drop', (e) => {
        e.preventDefault();
        trashBin.classList.remove('drag-over');
        if (typeof state !== 'undefined' && state.draggingNode) {
            state.selectedNode = state.draggingNode;
            if (typeof deleteSelectedNode === 'function') deleteSelectedNode();
            state.draggingNode = null;
        }
    });
}