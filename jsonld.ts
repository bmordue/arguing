import { Graph, Node, Edge } from './types';

export const ARG_NS = 'https://example.org/argument#';
export const SCHEMA_NS = 'https://schema.org/';
export const DC_NS = 'http://purl.org/dc/elements/1.1/';
export const FOAF_NS = 'http://xmlns.com/foaf/0.1/';
export const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

// Map argument node types to JSON-LD/Schema.org types
const NODE_TYPE_MAP: Record<string, string> = {
    claim: 'arg:Claim',
    premise: 'arg:Premise',
    conclusion: 'arg:Conclusion',
    rebuttal: 'arg:Rebuttal',
    node: 'arg:ArgumentNode',
};

// Map edge labels to predicate IRIs
const EDGE_LABEL_MAP: Record<string, string> = {
    Because: 'arg:because',
    Therefore: 'arg:therefore',
};

export function getNodeType(type: string | undefined): string {
    const normalized = (type || 'node').toLowerCase();
    return NODE_TYPE_MAP[normalized] ?? 'arg:ArgumentNode';
}

export function getEdgePredicate(label: string): string {
    return EDGE_LABEL_MAP[label] ?? 'arg:relatedTo';
}

// JSON-LD context object for argument graphs
export const ARGUMENT_CONTEXT = {
    schema: SCHEMA_NS,
    arg: ARG_NS,
    dc: DC_NS,
    foaf: FOAF_NS,
    rdf: RDF_NS,
    label: 'schema:name',
    source: { '@id': 'arg:source', '@type': '@id' },
    target: { '@id': 'arg:target', '@type': '@id' },
    relation: 'arg:relation',
    Claim: 'arg:Claim',
    Premise: 'arg:Premise',
    Conclusion: 'arg:Conclusion',
    Rebuttal: 'arg:Rebuttal',
    ArgumentNode: 'arg:ArgumentNode',
    ArgumentRelation: 'arg:ArgumentRelation',
    ArgumentGraph: 'arg:ArgumentGraph',
};

function nodeToJsonLd(node: Node): Record<string, unknown> {
    const id = String(node.id);
    return {
        '@id': `${ARG_NS}node/${id}`,
        '@type': getNodeType(node.type),
        'schema:name': node.label,
    };
}

function edgeToJsonLd(edge: Edge, index: number): Record<string, unknown> {
    const labels = Array.isArray(edge.label) ? edge.label : [edge.label];
    return {
        '@id': `${ARG_NS}edge/${index}`,
        '@type': 'arg:ArgumentRelation',
        'arg:source': { '@id': `${ARG_NS}node/${String(edge.source)}` },
        'arg:target': { '@id': `${ARG_NS}node/${String(edge.target)}` },
        'arg:relation': labels.map((l) => getEdgePredicate(l)),
    };
}

// Convert a Graph to a JSON-LD document
export function graphToJsonLd(graph: Graph): Record<string, unknown> {
    const graphNodes = graph.nodes.map(nodeToJsonLd);
    const graphEdges = graph.edges.map((edge, index) => edgeToJsonLd(edge, index));

    return {
        '@context': ARGUMENT_CONTEXT,
        '@type': 'arg:ArgumentGraph',
        '@graph': [...graphNodes, ...graphEdges],
    };
}
