const contextMenu = document.getElementById('context-menu');
const colorPicker = document.getElementById('color-picker');
const trashBin = document.getElementById('trash-bin');
let contextTarget = null;
let contextType = null;

function showContextMenu(x, y, target, type) {
    contextTarget = target;
    contextType = type;
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('active');
    colorPicker.classList.remove('active');
}

function hideContextMenu() {
    contextMenu.classList.remove('active');
    colorPicker.classList.remove('active');
    contextTarget = null;
    contextType = null;
}

document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target) && !colorPicker.contains(e.target)) hideContextMenu();
});

contextMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.context-item');
    if (!item) return;
    const action = item.dataset.action;

    if (action === 'delete') {
        if (contextType === 'node' && contextTarget) {
            state.selectedNode = contextTarget;
            deleteSelectedNode();
        } else if (contextType === 'edge' && contextTarget) {
            state.selectedEdge = contextTarget;
            deleteSelectedEdge();
        }
    } else if (action === 'rename') {
        if (contextType === 'node' && contextTarget) {
            const newName = prompt('Rename node:', NODE_TYPES[contextTarget.type].label);
            if (newName) {
                contextTarget.config._customName = newName;
                const el = document.getElementById(contextTarget.id);
                if (el) el.querySelector('.node-header span').textContent = newName;
            }
        }
    } else if (action === 'color') {
        const rect = item.getBoundingClientRect();
        colorPicker.style.left = rect.right + 8 + 'px';
        colorPicker.style.top = rect.top + 'px';
        colorPicker.classList.add('active');
    }
    hideContextMenu();
});

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
        contextTarget.config._color = color;
    }
    colorPicker.classList.remove('active');
});


trashBin.addEventListener('dragover', (e) => { e.preventDefault(); trashBin.classList.add('drag-over'); });
trashBin.addEventListener('dragleave', () => trashBin.classList.remove('drag-over'));
trashBin.addEventListener('drop', (e) => {
    e.preventDefault();
    trashBin.classList.remove('drag-over');
    if (state.draggingNode) {
        state.selectedNode = state.draggingNode;
        deleteSelectedNode();
        state.draggingNode = null;
    }
});
