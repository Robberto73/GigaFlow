// ===== CONFIG & STATE =====
const API_BASE = '/api';
const MAX_NODES = 50;

const state = {
    currentView: 'canvas',
    nodes: [],
    edges: [],
    selectedNode: null,
    selectedEdge: null,
    draggingNode: null,
    dragOffset: {x:0, y:0},
    connecting: null,
    mousePos: {x:0, y:0},
    canvasOffset: {x:0, y:0},
    isPanning: false,
    panStart: {x:0, y:0},
    pipelineId: 'pipeline-' + Date.now(),
    chatHistory: [],
    tools: [],
    nodeIdCounter: 0,
};

const views = {
    canvas: document.getElementById('canvas-view'),
    chat: document.getElementById('chat-view'),
    tools: document.getElementById('tools-view'),
    rag: document.getElementById('rag-view'),
    pipelines: document.getElementById('pipelines-view'),
};

const navItems = document.querySelectorAll('.nav-item');
