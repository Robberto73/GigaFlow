// ===== CANVAS =====
const canvasContainer = document.getElementById('canvas-container');
const canvasSvg = document.getElementById('canvas-svg');
const edgesLayer = document.getElementById('edges-layer');
const nodesLayer = document.getElementById('nodes-layer');
const canvasNodes = document.getElementById('canvas-nodes');
const configPanel = document.getElementById('config-panel');
const configBody = document.getElementById('config-body');
const configTitle = document.getElementById('config-title');

const NODE_TYPES = {
    agent: { label: 'Agent', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8m-4-4h8"/></svg>' },
    tool: { label: 'Tool', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>' },
    judge: { label: 'Judge', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    loop: { label: 'Loop', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>' },
    condition: { label: 'Condition', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/></svg>' },
    rag: { label: 'RAG', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' },
    input: { label: 'Input', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>' },
    output: { label: 'Output', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>' },
};

function createNode(type, x, y) {
    if (state.nodes.length >= MAX_NODES) {
        showToast('Limit: max ' + MAX_NODES + ' nodes on canvas', 'warning');
        return null;
    }
    const id = 'node-' + (++state.nodeIdCounter);
    const nodeDef = NODE_TYPES[type];
    const node = {
        id, type, x, y,
        config: getDefaultConfig(type),
    };
    state.nodes.push(node);
    renderNode(node);
    return node;
}

function getDefaultConfig(type) {
    const configs = {
        agent: { system_prompt: 'Ty poleznyy assistent.', use_rag: false, rag_top_k: 3, tools: [], temperature: 0.3, max_tokens: 4096, stream: true, timeout: 60, retry_count: 1, stop_sequences: '' },
        tool: { tool_name: '', parameters: {}, timeout: 30, retry_on_error: true, fallback_value: '' },
        judge: { criteria: 'Kachestvo i polnota otveta', min_score: 7, auto_retry: false, max_retries: 2, feedback_mode: 'score_only' },
        loop: { iterations: 3, break_on_empty: true, break_on_error: false, collect_results: true, delay_ms: 0 },
        condition: { condition: 'len(output) > 0', true_label: 'Yes', false_label: 'No', case_sensitive: false },
        rag: { top_k: 5, score_threshold: 0.5, rerank: false, chunk_size: 512, include_metadata: true },
        input: { source_type: 'text', placeholder: 'Enter input...', default_value: '', file_path: '', file_content: '', file_name: '', multiline: true, required: true },
        output: { template: '{{output}}', save_to_file: false, file_path: '', file_format: 'txt', append_mode: false, preview_length: 500, show_timestamp: false },
    };
    return JSON.parse(JSON.stringify(configs[type] || {}));
}

function renderNode(node) {
    const def = NODE_TYPES[node.type];
    const el = document.createElement('div');
    el.className = `node node-type-${node.type}`;
    el.id = node.id;
    el.style.left = node.x + 'px';
    el.style.top = node.y + 'px';
    el.innerHTML = `
        <div class="node-ports">
            <div class="port input" data-node="${node.id}" data-port="input"></div>
            <div class="port output" data-node="${node.id}" data-port="output"></div>
        </div>
        <div class="node-header">
            <div class="node-icon">${def.icon}</div>
            <span>${node.config._customName || def.label}</span>
        </div>
        <div class="node-body">${getNodePreview(node)}</div>
        <div class="node-footer">
            <span>${node.type}</span>
            <span>${node.id}</span>
        </div>
    `;

    el.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('port')) return;
        state.draggingNode = node;
        const rect = el.getBoundingClientRect();
        state.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        selectNode(node);
        e.stopPropagation();
    });

    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, node, 'node');
    });

    const ports = el.querySelectorAll('.port');
    ports.forEach(port => {
        port.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const isOutput = port.classList.contains('output');
            const rect = port.getBoundingClientRect();
            const cRect = canvasContainer.getBoundingClientRect();
            state.connecting = {
                nodeId: node.id, port: isOutput ? 'output' : 'input',
                x: rect.left - cRect.left + rect.width/2,
                y: rect.top - cRect.top + rect.height/2
            };
        });
    });

    canvasNodes.appendChild(el);
}

function getNodePreview(node) {
    const cfg = node.config;
    switch(node.type) {
        case 'agent': return (cfg.system_prompt || 'Agent').substring(0, 40) + '...';
        case 'tool': return cfg.tool_name || 'Select tool';
        case 'judge': return (cfg.criteria || 'Judge').substring(0, 40) + '...';
        case 'loop': return (cfg.iterations || 3) + ' iters';
        case 'condition': return (cfg.condition || 'Condition').substring(0, 40) + '...';
        case 'rag': return 'Top ' + (cfg.top_k || 5) + ' results';
        case 'input': return cfg.source_type === 'file' ? (cfg.file_name || 'Drop file') : (cfg.placeholder || 'Input');
        case 'output': return cfg.save_to_file ? ('Save: ' + (cfg.file_format || 'txt')) : 'Output';
        default: return node.type;
    }
}

function updateNodePosition(node) {
    const el = document.getElementById(node.id);
    if (el) { el.style.left = node.x + 'px'; el.style.top = node.y + 'px'; }
    renderEdges();
}

function selectNode(node) {
    state.selectedNode = node;
    document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
    const el = document.getElementById(node.id);
    if (el) el.classList.add('selected');
    showNodeConfig(node);
}

function showNodeConfig(node) {
    configPanel.classList.add('active');
    configTitle.textContent = (node.config._customName || NODE_TYPES[node.type].label) + ' Configuration';
    configBody.innerHTML = generateConfigForm(node);

    configBody.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('change', () => {
            saveNodeConfig(node);
            if (input.id === 'cfg-source_type') { showNodeConfig(node); setTimeout(() => setupInputFileDrop(node), 50); }
            if (input.id === 'cfg-save_to_file') showNodeConfig(node);
        });
        input.addEventListener('input', () => {
            saveNodeConfig(node);
            if (input.type === 'range') {
                const valEl = document.getElementById(input.id + '-val');
                if (valEl) valEl.textContent = input.value;
            }
        });
    });
    if (node.type === 'input' && node.config.source_type === 'file') {
        setTimeout(() => setupInputFileDrop(node), 50);
    }
}

function generateConfigForm(node) {
    const cfg = node.config;
    let html = '';

    if (node.type === 'agent') {
        html += '<div class="config-section"><div class="config-section-title">Prompt</div>';
        html += formField('System Prompt', 'textarea', 'system_prompt', cfg.system_prompt);
        html += formField('Temperature', 'range', 'temperature', cfg.temperature, 0, 2, 0.1);
        html += formField('Max Tokens', 'number', 'max_tokens', cfg.max_tokens);
        html += formField('Timeout (sec)', 'number', 'timeout', cfg.timeout);
        html += formField('Stop Sequences', 'input', 'stop_sequences', cfg.stop_sequences);
        html += '</div>';
        html += '<div class="config-section"><div class="config-section-title">RAG</div>';
        html += formField('Use RAG', 'checkbox', 'use_rag', cfg.use_rag);
        html += formField('RAG Top K', 'number', 'rag_top_k', cfg.rag_top_k);
        html += '</div>';
        html += '<div class="config-section"><div class="config-section-title">Tools</div>';
        html += `<div class="form-group"><label>Attached Tools</label><select id="cfg-tools" multiple style="min-height:80px">${state.tools.map(t => `<option value="${t.name}" ${(cfg.tools||[]).includes(t.name)?'selected':''}>${t.name}</option>`).join('')}</select></div>`;
        html += formField('Stream Response', 'checkbox', 'stream', cfg.stream);
        html += formField('Retry Count', 'number', 'retry_count', cfg.retry_count);
        html += '</div>';
    } else if (node.type === 'tool') {
        html += '<div class="config-section"><div class="config-section-title">Tool Selection</div>';
        html += `<div class="form-group"><label>Tool</label><select id="cfg-tool_name">${state.tools.map(t => `<option value="${t.name}" ${cfg.tool_name===t.name?'selected':''}>${t.name}</option>`).join('')}</select></div>`;
        html += '</div>';
        html += '<div class="config-section"><div class="config-section-title">Parameters</div>';
        html += formField('Parameters (JSON)', 'textarea', 'parameters', JSON.stringify(cfg.parameters||{}, null, 2));
        html += formField('Timeout (sec)', 'number', 'timeout', cfg.timeout);
        html += formField('Retry on Error', 'checkbox', 'retry_on_error', cfg.retry_on_error);
        html += formField('Fallback Value', 'input', 'fallback_value', cfg.fallback_value);
        html += '</div>';
    } else if (node.type === 'judge') {
        html += '<div class="config-section"><div class="config-section-title">Evaluation</div>';
        html += formField('Criteria', 'textarea', 'criteria', cfg.criteria);
        html += formField('Min Score (0-10)', 'number', 'min_score', cfg.min_score);
        html += formField('Auto Retry', 'checkbox', 'auto_retry', cfg.auto_retry);
        html += formField('Max Retries', 'number', 'max_retries', cfg.max_retries);
        html += '</div>';
        html += '<div class="config-section"><div class="config-section-title">Output</div>';
        html += `<div class="form-group"><label>Feedback Mode</label><select id="cfg-feedback_mode"><option value="score_only" ${cfg.feedback_mode==='score_only'?'selected':''}>Score Only</option><option value="score_and_reason" ${cfg.feedback_mode==='score_and_reason'?'selected':''}>Score + Reason</option><option value="full" ${cfg.feedback_mode==='full'?'selected':''}>Full JSON</option></select></div>`;
        html += '</div>';
    } else if (node.type === 'loop') {
        html += '<div class="config-section"><div class="config-section-title">Loop Settings</div>';
        html += formField('Iterations', 'number', 'iterations', cfg.iterations);
        html += formField('Break on Empty', 'checkbox', 'break_on_empty', cfg.break_on_empty);
        html += formField('Break on Error', 'checkbox', 'break_on_error', cfg.break_on_error);
        html += formField('Collect Results', 'checkbox', 'collect_results', cfg.collect_results);
        html += formField('Delay (ms)', 'number', 'delay_ms', cfg.delay_ms);
        html += '</div>';
    } else if (node.type === 'condition') {
        html += '<div class="config-section"><div class="config-section-title">Condition</div>';
        html += formField('Condition', 'textarea', 'condition', cfg.condition);
        html += formField('True Label', 'input', 'true_label', cfg.true_label);
        html += formField('False Label', 'input', 'false_label', cfg.false_label);
        html += formField('Case Sensitive', 'checkbox', 'case_sensitive', cfg.case_sensitive);
        html += '</div>';
    } else if (node.type === 'rag') {
        html += '<div class="config-section"><div class="config-section-title">Search</div>';
        html += formField('Top K', 'number', 'top_k', cfg.top_k);
        html += formField('Score Threshold', 'range', 'score_threshold', cfg.score_threshold, 0, 1, 0.05);
        html += formField('Rerank', 'checkbox', 'rerank', cfg.rerank);
        html += '</div>';
        html += '<div class="config-section"><div class="config-section-title">Indexing</div>';
        html += formField('Chunk Size', 'number', 'chunk_size', cfg.chunk_size);
        html += formField('Include Metadata', 'checkbox', 'include_metadata', cfg.include_metadata);
        html += '</div>';
    } else if (node.type === 'input') {
        html += '<div class="config-section"><div class="config-section-title">Source</div>';
        html += `<div class="form-group"><label>Source Type</label><select id="cfg-source_type"><option value="text" ${cfg.source_type==='text'?'selected':''}>Text</option><option value="file" ${cfg.source_type==='file'?'selected':''}>File</option><option value="url" ${cfg.source_type==='url'?'selected':''}>URL</option></select></div>`;
        if (cfg.source_type === 'file') {
            html += '<div class="form-group"><label>File</label>';
            if (cfg.file_name) html += `<div class="input-file-info"><span class="file-name">${cfg.file_name}</span><button class="file-remove" onclick="clearInputFile()">×</button></div>`;
            html += `<div class="input-file-drop" id="input-file-drop"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><p>Drop file or click</p><input type="file" id="input-file-picker"></div>`;
            html += '</div>';
        } else if (cfg.source_type === 'url') {
            html += formField('URL', 'input', 'file_path', cfg.file_path);
        }
        html += formField('Placeholder', 'input', 'placeholder', cfg.placeholder);
        html += formField('Default Value', 'textarea', 'default_value', cfg.default_value);
        html += formField('Multiline', 'checkbox', 'multiline', cfg.multiline);
        html += formField('Required', 'checkbox', 'required', cfg.required);
        html += '</div>';
    } else if (node.type === 'output') {
        html += '<div class="config-section"><div class="config-section-title">Template</div>';
        html += formField('Template', 'textarea', 'template', cfg.template);
        html += formField('Show Timestamp', 'checkbox', 'show_timestamp', cfg.show_timestamp);
        html += '</div>';
        html += '<div class="config-section"><div class="config-section-title">File Save</div>';
        html += formField('Save to File', 'checkbox', 'save_to_file', cfg.save_to_file);
        if (cfg.save_to_file) {
            html += formField('File Path', 'input', 'file_path', cfg.file_path);
            html += `<div class="form-group"><label>Format</label><select id="cfg-file_format"><option value="txt" ${cfg.file_format==='txt'?'selected':''}>Text (.txt)</option><option value="csv" ${cfg.file_format==='csv'?'selected':''}>CSV (.csv)</option><option value="xlsx" ${cfg.file_format==='xlsx'?'selected':''}>Excel (.xlsx)</option><option value="json" ${cfg.file_format==='json'?'selected':''}>JSON (.json)</option><option value="md" ${cfg.file_format==='md'?'selected':''}>Markdown (.md)</option></select></div>`;
            html += formField('Append Mode', 'checkbox', 'append_mode', cfg.append_mode);
        }
        html += '</div>';
        html += '<div class="config-section"><div class="config-section-title">Preview</div>';
        html += formField('Preview Length', 'number', 'preview_length', cfg.preview_length);
        html += '</div>';
    }

    // Stub actions
    if (node.config._isStub) {
        html += '<div class="config-section"><div class="config-section-title">Stub Status</div>';
        html += `<div class="stub-desc"><strong>Description:</strong> ${node.config._stubDesc || 'No description'}</div>`;
        html += `<div class="stub-actions">
            <button class="btn-primary" onclick="implementStubNode('${node.id}')">Implement with AI</button>
            <button class="btn-secondary" onclick="unmakeNodeStub(state.selectedNode); showNodeConfig(state.selectedNode);">Mark as Complete</button>
        </div>`;
        html += '</div>';
    }

    html += `<button class="btn-primary" style="width:100%;margin-top:10px" onclick="deleteSelectedNode()">Delete Node</button>`;
    return html;
}

function formField(label, type, key, value, min, max, step) {
    const id = 'cfg-' + key;
    if (type === 'textarea') return `<div class="form-group"><label>${label}</label><textarea id="${id}">${value || ''}</textarea></div>`;
    if (type === 'checkbox') return `<div class="form-group"><label class="checkbox-label"><input type="checkbox" id="${id}" ${value ? 'checked' : ''}> ${label}</label></div>`;
    if (type === 'range') {
        const val = value !== undefined ? value : (min || 0);
        return `<div class="form-group"><label>${label}</label><input type="range" id="${id}" min="${min || 0}" max="${max || 1}" step="${step || 0.1}" value="${val}"><div class="range-value" id="${id}-val">${val}</div></div>`;
    }
    return `<div class="form-group"><label>${label}</label><input type="${type}" id="${id}" value="${value || ''}"></div>`;
}

function saveNodeConfig(node) {
    const cfg = node.config;
    const getVal = (id, def) => {
        const el = document.getElementById('cfg-' + id);
        if (!el) return def;
        if (el.type === 'checkbox') return el.checked;
        if (el.type === 'number') return parseFloat(el.value) || def;
        if (el.type === 'range') return parseFloat(el.value) || def;
        return el.value;
    };

    if (node.type === 'agent') {
        cfg.system_prompt = getVal('system_prompt', '');
        cfg.use_rag = getVal('use_rag', false);
        cfg.rag_top_k = getVal('rag_top_k', 3);
        cfg.temperature = getVal('temperature', 0.3);
        cfg.max_tokens = getVal('max_tokens', 4096);
        cfg.timeout = getVal('timeout', 60);
        cfg.stream = getVal('stream', true);
        cfg.retry_count = getVal('retry_count', 1);
        cfg.stop_sequences = getVal('stop_sequences', '');
        const toolsSelect = document.getElementById('cfg-tools');
        if (toolsSelect) cfg.tools = Array.from(toolsSelect.selectedOptions).map(o => o.value);
    } else if (node.type === 'tool') {
        cfg.tool_name = getVal('tool_name', '');
        try { cfg.parameters = JSON.parse(getVal('parameters', '{}')); } catch(e) {}
        cfg.timeout = getVal('timeout', 30);
        cfg.retry_on_error = getVal('retry_on_error', true);
        cfg.fallback_value = getVal('fallback_value', '');
    } else if (node.type === 'judge') {
        cfg.criteria = getVal('criteria', '');
        cfg.min_score = getVal('min_score', 7);
        cfg.auto_retry = getVal('auto_retry', false);
        cfg.max_retries = getVal('max_retries', 2);
        const fm = document.getElementById('cfg-feedback_mode');
        if (fm) cfg.feedback_mode = fm.value;
    } else if (node.type === 'loop') {
        cfg.iterations = getVal('iterations', 3);
        cfg.break_on_empty = getVal('break_on_empty', true);
        cfg.break_on_error = getVal('break_on_error', false);
        cfg.collect_results = getVal('collect_results', true);
        cfg.delay_ms = getVal('delay_ms', 0);
    } else if (node.type === 'condition') {
        cfg.condition = getVal('condition', '');
        cfg.true_label = getVal('true_label', 'Yes');
        cfg.false_label = getVal('false_label', 'No');
        cfg.case_sensitive = getVal('case_sensitive', false);
    } else if (node.type === 'rag') {
        cfg.top_k = getVal('top_k', 5);
        cfg.score_threshold = getVal('score_threshold', 0.5);
        cfg.rerank = getVal('rerank', false);
        cfg.chunk_size = getVal('chunk_size', 512);
        cfg.include_metadata = getVal('include_metadata', true);
    } else if (node.type === 'input') {
        cfg.source_type = getVal('source_type', 'text');
        cfg.placeholder = getVal('placeholder', '');
        cfg.default_value = getVal('default_value', '');
        cfg.multiline = getVal('multiline', true);
        cfg.required = getVal('required', true);
        if (cfg.source_type === 'url') cfg.file_path = getVal('file_path', '');
    } else if (node.type === 'output') {
        cfg.template = getVal('template', '');
        cfg.save_to_file = getVal('save_to_file', false);
        cfg.file_path = getVal('file_path', '');
        const ff = document.getElementById('cfg-file_format');
        if (ff) cfg.file_format = ff.value;
        cfg.append_mode = getVal('append_mode', false);
        cfg.preview_length = getVal('preview_length', 500);
        cfg.show_timestamp = getVal('show_timestamp', false);
    }

    const el = document.getElementById(node.id);
    if (el) {
        el.querySelector('.node-header span').textContent = node.config._customName || NODE_TYPES[node.type].label;
        el.querySelector('.node-body').textContent = getNodePreview(node);
    }
}

function deleteSelectedNode() {
    if (!state.selectedNode) return;
    const id = state.selectedNode.id;
    state.nodes = state.nodes.filter(n => n.id !== id);
    state.edges = state.edges.filter(e => e.source !== id && e.target !== id);
    document.getElementById(id)?.remove();
    renderEdges();
    configPanel.classList.remove('active');
    state.selectedNode = null;
}

async function implementStubNode(nodeId) {
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node || !node.config._isStub) return;

    showToast('Asking AI to implement...', 'info');

    const prompt = `Implement this ${node.type} node for GigaFlow pipeline.\n\nType: ${node.type}\nDescription: ${node.config._stubDesc || ''}\nCurrent config: ${JSON.stringify(node.config, null, 2)}\n\n`;

    let implPrompt = prompt;
    if (node.type === 'tool') {
        implPrompt += `Write a complete Python tool function using @gigaflow_tool decorator. Return ONLY the Python code.`;
    } else if (node.type === 'agent') {
        implPrompt += `Write an optimized system prompt for this agent. Return ONLY the prompt text.`;
    } else {
        implPrompt += `Suggest the complete configuration for this node. Return as JSON.`;
    }

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: implPrompt }], stream: false })
        });
        const data = await res.json();
        const result = data.response || '';

        if (node.type === 'tool') {
            // Save as new tool file
            const toolName = 'auto_' + node.type + '_' + Date.now();
            await fetch(`${API_BASE}/tools/create`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: toolName, code: result })
            });
            node.config.tool_name = toolName;
            showToast('Tool implemented and saved: ' + toolName, 'success');
        } else if (node.type === 'agent') {
            node.config.system_prompt = result.trim();
            showToast('Agent prompt implemented', 'success');
        } else {
            try {
                const newConfig = JSON.parse(result);
                Object.assign(node.config, newConfig);
                showToast('Configuration implemented', 'success');
            } catch(e) {
                showToast('Could not parse config, applied as text', 'warning');
            }
        }

        unmakeNodeStub(node);
        showNodeConfig(node);

    } catch (e) {
        showToast('Implementation failed: ' + e.message, 'error');
    }
}

function clearInputFile() {
    if (!state.selectedNode) return;
    state.selectedNode.config.file_name = '';
    state.selectedNode.config.file_content = '';
    state.selectedNode.config.file_path = '';
    showNodeConfig(state.selectedNode);
}

function setupInputFileDrop(node) {
    const dropZone = document.getElementById('input-file-drop');
    const picker = document.getElementById('input-file-picker');
    if (!dropZone || !picker) return;

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleInputFile(e.dataTransfer.files[0], node); });
    picker.addEventListener('change', (e) => { if (e.target.files[0]) handleInputFile(e.target.files[0], node); });
}

async function handleInputFile(file, node) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        node.config.file_name = file.name;
        node.config.file_content = e.target.result;
        node.config.file_path = 'uploads/' + file.name;
        showNodeConfig(node);
    };
    reader.readAsText(file);
}

// ===== EDGES =====
function getPortCenter(nodeId, portType) {
    const nodeEl = document.getElementById(nodeId);
    if (!nodeEl) return null;
    const port = nodeEl.querySelector('.port.' + portType);
    if (!port) return null;
    const pRect = port.getBoundingClientRect();
    const cRect = canvasContainer.getBoundingClientRect();
    return { x: pRect.left - cRect.left + pRect.width / 2, y: pRect.top - cRect.top + pRect.height / 2 };
}

function renderEdges() {
    edgesLayer.innerHTML = '';
    state.edges.forEach((edge, idx) => {
        const src = getPortCenter(edge.source, 'output');
        const tgt = getPortCenter(edge.target, 'input');
        if (!src || !tgt) return;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = tgt.x - src.x;
        const c1x = src.x + Math.abs(dx) * 0.5;
        const c2x = tgt.x - Math.abs(dx) * 0.5;
        path.setAttribute('d', `M${src.x},${src.y} C${c1x},${src.y} ${c2x},${tgt.y} ${tgt.x},${tgt.y}`);
        path.setAttribute('class', 'edge-path');
        if (state.selectedEdge === edge) path.classList.add('selected');
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            state.selectedEdge = edge;
            renderEdges();
        });
        path.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, edge, 'edge');
        });
        edgesLayer.appendChild(path);
    });
}

function addEdge(source, target) {
    if (state.edges.find(e => e.source === source && e.target === target)) {
        showToast('Connection already exists', 'warning');
        return;
    }
    if (source === target) {
        showToast('Cannot connect node to itself', 'warning');
        return;
    }
    state.edges.push({ source, target, condition: null });
    renderEdges();
    updatePortVisuals();
}

function updatePortVisuals() {
    document.querySelectorAll('.port').forEach(p => p.classList.remove('connected'));
    state.edges.forEach(e => {
        const src = document.querySelector(`#${e.source} .port.output`);
        const tgt = document.querySelector(`#${e.target} .port.input`);
        if (src) src.classList.add('connected');
        if (tgt) tgt.classList.add('connected');
    });
}

function deleteSelectedEdge() {
    if (!state.selectedEdge) return;
    state.edges = state.edges.filter(e => e !== state.selectedEdge);
    state.selectedEdge = null;
    renderEdges();
    updatePortVisuals();
}

// ===== CANVAS MOUSE EVENTS =====
canvasContainer.addEventListener('mousedown', (e) => {
    if (e.target === canvasContainer || e.target === canvasSvg || e.target.tagName === 'svg') {
        state.isPanning = true;
        state.panStart = { x: e.clientX, y: e.clientY };
        canvasContainer.style.cursor = 'grabbing';
        configPanel.classList.remove('active');
        state.selectedNode = null;
        document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
    }
});

document.addEventListener('mousemove', (e) => {
    const rect = canvasContainer.getBoundingClientRect();
    state.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (state.draggingNode) {
        state.draggingNode.x = state.mousePos.x - state.dragOffset.x;
        state.draggingNode.y = state.mousePos.y - state.dragOffset.y;
        updateNodePosition(state.draggingNode);
    }

    if (state.isPanning) {
        const dx = e.clientX - state.panStart.x;
        const dy = e.clientY - state.panStart.y;
        canvasContainer.scrollLeft -= dx;
        canvasContainer.scrollTop -= dy;
        state.panStart = { x: e.clientX, y: e.clientY };
    }

    if (state.connecting) {
        renderTempEdge(state.connecting.x, state.connecting.y, state.mousePos.x, state.mousePos.y);
    }
});

document.addEventListener('mouseup', (e) => {
    if (state.connecting) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el && el.classList.contains('port')) {
            const targetNodeId = el.dataset.node;
            const targetPort = el.dataset.port;
            if (state.connecting.port === 'output' && targetPort === 'input') {
                addEdge(state.connecting.nodeId, targetNodeId);
            } else if (state.connecting.port === 'input' && targetPort === 'output') {
                addEdge(targetNodeId, state.connecting.nodeId);
            }
        }
        state.connecting = null;
        renderTempEdge(0,0,0,0, true);
    }

    state.draggingNode = null;
    state.isPanning = false;
    canvasContainer.style.cursor = 'grab';
});

document.addEventListener('keydown', (e) => {
    // Prevent deletion when typing in input fields
    if (e.key === 'Delete' || e.key === 'Backspace') {
        // Check if focus is in an input, textarea, or contenteditable
        const activeElement = document.activeElement;
        const isInput = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.isContentEditable
        );
        
        // Only allow deletion if not typing in an input
        if (!isInput) {
            if (state.selectedNode) deleteSelectedNode();
            if (state.selectedEdge) deleteSelectedEdge();
        }
    }
});

let tempEdgePath = null;
function renderTempEdge(x1, y1, x2, y2, clear = false) {
    if (clear) {
        if (tempEdgePath) tempEdgePath.remove();
        tempEdgePath = null;
        return;
    }
    if (!tempEdgePath) {
        tempEdgePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempEdgePath.setAttribute('stroke', '#999');
        tempEdgePath.setAttribute('stroke-width', '2');
        tempEdgePath.setAttribute('stroke-dasharray', '5,5');
        tempEdgePath.setAttribute('fill', 'none');
        edgesLayer.appendChild(tempEdgePath);
    }
    const dx = x2 - x1;
    const c1x = x1 + Math.abs(dx) * 0.5;
    const c2x = x2 - Math.abs(dx) * 0.5;
    tempEdgePath.setAttribute('d', `M${x1},${y1} C${c1x},${y1} ${c2x},${y2} ${x2},${y2}`);
}

// ===== TOOLBAR =====
document.getElementById('add-agent-btn').addEventListener('click', () => createNode('agent', 100, 100));
document.getElementById('add-tool-btn').addEventListener('click', () => createNode('tool', 100, 100));
document.getElementById('add-judge-btn').addEventListener('click', () => createNode('judge', 100, 100));
document.getElementById('add-loop-btn').addEventListener('click', () => createNode('loop', 100, 100));
document.getElementById('add-condition-btn').addEventListener('click', () => createNode('condition', 100, 100));
document.getElementById('add-rag-btn').addEventListener('click', () => createNode('rag', 100, 100));
document.getElementById('add-input-btn').addEventListener('click', () => createNode('input', 100, 100));
document.getElementById('add-output-btn').addEventListener('click', () => createNode('output', 100, 100));

document.getElementById('clear-canvas-btn').addEventListener('click', () => {
    showConfirm('Clear all nodes and edges?', () => {
        state.nodes = [];
        state.edges = [];
        canvasNodes.innerHTML = '';
        renderEdges();
        configPanel.classList.remove('active');
        showToast('Canvas cleared', 'info');
    });
});

document.getElementById('close-config').addEventListener('click', () => {
    configPanel.classList.remove('active');
    state.selectedNode = null;
    document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
});

// ===== PIPELINE VALIDATION =====
function validatePipeline() {
    const errors = [];
    if (state.nodes.length === 0) errors.push('No nodes on canvas');
    const hasInput = state.nodes.some(n => n.type === 'input');
    const hasOutput = state.nodes.some(n => n.type === 'output');
    if (!hasInput) errors.push('Missing Input node');
    if (!hasOutput) errors.push('Missing Output node');
    state.nodes.forEach(n => {
        if (n.type !== 'input') {
            const hasIncoming = state.edges.some(e => e.target === n.id);
            if (!hasIncoming) errors.push('Node "' + n.id + '" has no incoming connection');
        }
    });
    state.nodes.filter(n => n.type === 'agent').forEach(n => {
        if (!n.config.system_prompt || n.config.system_prompt.length < 3) {
            errors.push('Agent "' + n.id + '" system prompt is too short');
        }
    });
    state.nodes.filter(n => n.type === 'tool').forEach(n => {
        if (!n.config.tool_name) errors.push('Tool node "' + n.id + '" has no tool selected');
    });
    return errors;
}

// ===== RUN PIPELINE =====
document.getElementById('run-pipeline-btn').addEventListener('click', async () => {
    const validationErrors = validatePipeline();
    if (validationErrors.length > 0) {
        showToast('Validation errors:' + validationErrors.join(''), 'error', 5000);
        return;
    }

    const pipelineData = {
        id: state.pipelineId,
        name: 'Current Pipeline',
        nodes: state.nodes.map(n => ({ id: n.id, type: n.type, config: n.config, position: { x: n.x, y: n.y } })),
        edges: state.edges.map(e => ({ source: e.source, target: e.target, condition: e.condition }))
    };

    await fetch(`${API_BASE}/pipelines`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipelineData)
    });

    const inputNode = state.nodes.find(n => n.type === 'input');
    const initialInput = inputNode ? (inputNode.config.default_value || inputNode.config.placeholder || 'Hello') : 'Hello';

    const response = await fetch(`${API_BASE}/pipelines/${state.pipelineId}/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: initialInput, context: {} })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.trim());
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try { handlePipelineEvent(JSON.parse(data)); } catch(e) {}
            }
        }
    }
});

function handlePipelineEvent(event) {
    if (event.node) {
        const el = document.getElementById(event.node);
        if (el) {
            if (event.status === 'running') el.classList.add('running');
            if (event.status === 'completed') {
                el.classList.remove('running');
                const preview = (event.output || '').substring(0, 60);
                el.querySelector('.node-body').textContent = preview + (preview.length >= 60 ? '...' : '');
            }
        }
    }
    if (event.status === 'finished') {
        document.querySelectorAll('.node').forEach(n => n.classList.remove('running'));
        showToast('Pipeline execution completed', 'success');
    }
}

// ===== SAVE PIPELINE =====
document.getElementById('save-pipeline-btn').addEventListener('click', async () => {
    const pipelineData = {
        id: state.pipelineId,
        name: 'Pipeline ' + new Date().toLocaleString(),
        nodes: state.nodes.map(n => ({ id: n.id, type: n.type, config: n.config, position: { x: n.x, y: n.y } })),
        edges: state.edges.map(e => ({ source: e.source, target: e.target, condition: e.condition }))
    };
    await fetch(`${API_BASE}/pipelines`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pipelineData)
    });
    showToast('Pipeline saved!', 'success');
});
