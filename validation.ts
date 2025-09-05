import { Node, Edge, Graph } from './types';

// Validation functions
export function validateNode(node: any, index: number): void {
    if (!node || typeof node !== 'object') {
        throw new Error(`Node at index ${index} is not a valid object`);
    }
    if (!node.id && node.id !== 0) {
        throw new Error(`Node at index ${index} missing required 'id' field`);
    }
    if (!node.label || typeof node.label !== 'string') {
        throw new Error(`Node at index ${index} missing or invalid 'label' field`);
    }
}

export function validateEdge(edge: any, index: number): void {
    if (!edge || typeof edge !== 'object') {
        throw new Error(`Edge at index ${index} is not a valid object`);
    }
    if (!edge.source && edge.source !== 0) {
        throw new Error(`Edge at index ${index} missing required 'source' field`);
    }
    if (!edge.target && edge.target !== 0) {
        throw new Error(`Edge at index ${index} missing required 'target' field`);
    }
    if (!edge.label) {
        throw new Error(`Edge at index ${index} missing required 'label' field`);
    }
}

export function validateGraph(graph: any): Graph {
    if (!graph || typeof graph !== 'object') {
        throw new Error('Graph data is not a valid object');
    }
    
    if (!Array.isArray(graph.nodes)) {
        throw new Error('Graph must contain a "nodes" array');
    }
    
    if (!Array.isArray(graph.edges)) {
        throw new Error('Graph must contain an "edges" array');
    }

    // Validate each node
    graph.nodes.forEach((node: any, index: number) => {
        validateNode(node, index);
    });

    // Validate each edge
    graph.edges.forEach((edge: any, index: number) => {
        validateEdge(edge, index);
    });

    return graph as Graph;
}