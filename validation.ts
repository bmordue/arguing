import { Node, Edge, Graph } from './types';

// Security constants
export const MAX_ID_LENGTH = 1024;
export const MAX_LABEL_LENGTH = 10000;
export const MAX_TYPE_LENGTH = 1024;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_NODES_COUNT = 100000;
export const MAX_EDGES_COUNT = 500000;

// Validation functions
export function validateNode(node: Node, index: number): void {
    if (!node || typeof node !== 'object') {
        throw new Error(`Node at index ${index} is not a valid object`);
    }
    if (node.id === undefined || node.id === null || node.id === '') {
        throw new Error(`Node at index ${index} missing required 'id' field`);
    }

    // Security check: ID type
    if (typeof node.id !== 'string' && typeof node.id !== 'number') {
        throw new Error(`Node at index ${index} 'id' must be a string or number`);
    }

    // Security check: ID length
    const idStr = String(node.id);
    if (idStr.length > MAX_ID_LENGTH) {
        throw new Error(`Node at index ${index} ID exceeds maximum length of ${MAX_ID_LENGTH}`);
    }

    if (node.label === undefined || node.label === null || typeof node.label !== 'string') {
        throw new Error(`Node at index ${index} missing or invalid 'label' field`);
    }

    // Security check: Label length
    if (node.label.length > MAX_LABEL_LENGTH) {
        throw new Error(`Node at index ${index} label exceeds maximum length of ${MAX_LABEL_LENGTH}`);
    }

    // Security check: Type length
    if (node.type && typeof node.type === 'string' && node.type.length > MAX_TYPE_LENGTH) {
        throw new Error(`Node at index ${index} type exceeds maximum length of ${MAX_TYPE_LENGTH}`);
    }
}

export function validateEdge(edge: Edge, index: number): void {
    if (!edge || typeof edge !== 'object') {
        throw new Error(`Edge at index ${index} is not a valid object`);
    }
    if (edge.source === undefined || edge.source === null || edge.source === '') {
        throw new Error(`Edge at index ${index} missing required 'source' field`);
    }
    if (edge.target === undefined || edge.target === null || edge.target === '') {
        throw new Error(`Edge at index ${index} missing required 'target' field`);
    }

    // Security check: Source/Target ID type
    if (typeof edge.source !== 'string' && typeof edge.source !== 'number') {
        throw new Error(`Edge at index ${index} 'source' must be a string or number`);
    }
    if (typeof edge.target !== 'string' && typeof edge.target !== 'number') {
        throw new Error(`Edge at index ${index} 'target' must be a string or number`);
    }

    // Security check: Source/Target ID length
    if (String(edge.source).length > MAX_ID_LENGTH || String(edge.target).length > MAX_ID_LENGTH) {
        throw new Error(`Edge at index ${index} source or target ID exceeds maximum length of ${MAX_ID_LENGTH}`);
    }

    if (edge.label === undefined || edge.label === null) {
        throw new Error(`Edge at index ${index} missing required 'label' field`);
    }

    // Security check: Label type and length (handling both string and string[])
    if (typeof edge.label !== 'string' && !Array.isArray(edge.label)) {
        throw new Error(`Edge at index ${index} 'label' must be a string or string array`);
    }

    if (Array.isArray(edge.label)) {
        for (let i = 0; i < edge.label.length; i++) {
            if (typeof edge.label[i] !== 'string') {
                throw new Error(`Edge at index ${index} 'label' array contains non-string element at index ${i}`);
            }
        }
    }

    const labelStr = Array.isArray(edge.label) ? edge.label.join(',') : edge.label;
    if (labelStr.length > MAX_LABEL_LENGTH) {
        throw new Error(`Edge at index ${index} label exceeds maximum length of ${MAX_LABEL_LENGTH}`);
    }
}

export function validateGraph(graph: Graph): Graph {
    if (!graph || typeof graph !== 'object') {
        throw new Error('Graph data is not a valid object');
    }
    
    if (!Array.isArray(graph.nodes)) {
        throw new Error('Graph must contain a "nodes" array');
    }

    // Security check: Nodes count
    if (graph.nodes.length > MAX_NODES_COUNT) {
        throw new Error(`Graph nodes count exceeds maximum of ${MAX_NODES_COUNT}`);
    }
    
    if (!Array.isArray(graph.edges)) {
        throw new Error('Graph must contain an "edges" array');
    }

    // Security check: Edges count
    if (graph.edges.length > MAX_EDGES_COUNT) {
        throw new Error(`Graph edges count exceeds maximum of ${MAX_EDGES_COUNT}`);
    }

    // Validate each node
    graph.nodes.forEach((node: Node, index: number) => {
        validateNode(node, index);
    });

    // Validate each edge
    graph.edges.forEach((edge: Edge, index: number) => {
        validateEdge(edge, index);
    });

    return graph as Graph;
}