// ===== GigaFlow Entry Point =====
window.addEventListener('DOMContentLoaded', () => {
    loadTools();
    loadRagStats();
    testConnections();
    initLocalSettings();
    loadProjectContext();
    maybeStartTour();

    const n1 = createNode('input', 80, 150);
    const n2 = createNode('agent', 350, 150);
    const n3 = createNode('output', 620, 150);
    if (n1 && n2 && n3) {
        addEdge(n1.id, n2.id);
        addEdge(n2.id, n3.id);
    }
});
