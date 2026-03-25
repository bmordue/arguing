import { Graph } from './lib';
import { ARG_NS, SCHEMA_NS, DC_NS, FOAF_NS, RDF_NS, getNodeType, getEdgePredicate } from './jsonld';

// Expand a prefixed name like "arg:Claim" to its full IRI
function expandPrefixed(prefixed: string): string {
    const prefixes: Record<string, string> = {
        arg: ARG_NS,
        schema: SCHEMA_NS,
        dc: DC_NS,
        foaf: FOAF_NS,
        rdf: RDF_NS,
    };
    const colonIndex = prefixed.indexOf(':');
    if (colonIndex === -1) return prefixed;
    const prefix = prefixed.slice(0, colonIndex);
    const local = prefixed.slice(colonIndex + 1);
    return prefixes[prefix] ? `${prefixes[prefix]}${local}` : prefixed;
}

function iriRef(iri: string): string {
    return `<${iri}>`;
}

function literal(value: string): string {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${escaped}"`;
}

// --- N-Triples serialization ---

function nodeToNTriples(id: string, type: string, name: string): string[] {
    const subject = iriRef(`${ARG_NS}node/${id}`);
    const rdfType = iriRef(`${RDF_NS}type`);
    const typeIri = iriRef(expandPrefixed(type));
    const nameIri = iriRef(`${SCHEMA_NS}name`);
    return [
        `${subject} ${rdfType} ${typeIri} .`,
        `${subject} ${nameIri} ${literal(name)} .`,
    ];
}

function edgeToNTriples(source: string, target: string, labels: string[], index: number): string[] {
    const edgeSubject = iriRef(`${ARG_NS}edge/${index}`);
    const rdfType = iriRef(`${RDF_NS}type`);
    const edgeTypeIri = iriRef(`${ARG_NS}ArgumentRelation`);
    const sourcePred = iriRef(`${ARG_NS}source`);
    const targetPred = iriRef(`${ARG_NS}target`);
    const relationPred = iriRef(`${ARG_NS}relation`);
    const sourceIri = iriRef(`${ARG_NS}node/${source}`);
    const targetIri = iriRef(`${ARG_NS}node/${target}`);

    const triples = [
        `${edgeSubject} ${rdfType} ${edgeTypeIri} .`,
        `${edgeSubject} ${sourcePred} ${sourceIri} .`,
        `${edgeSubject} ${targetPred} ${targetIri} .`,
    ];
    for (const label of labels) {
        const predIri = iriRef(expandPrefixed(getEdgePredicate(label)));
        triples.push(`${edgeSubject} ${relationPred} ${predIri} .`);
    }
    return triples;
}

export function graphToNTriples(graph: Graph): string {
    const lines: string[] = [];

    for (const node of graph.nodes) {
        const id = String(node.id);
        const type = getNodeType(node.type);
        lines.push(...nodeToNTriples(id, type, node.label));
    }

    graph.edges.forEach((edge, index) => {
        const labels = Array.isArray(edge.label) ? edge.label : [edge.label];
        lines.push(...edgeToNTriples(String(edge.source), String(edge.target), labels, index));
    });

    return lines.join('\n') + '\n';
}

// --- Turtle serialization ---

const TURTLE_PREFIXES = [
    `@prefix rdf: <${RDF_NS}> .`,
    `@prefix schema: <${SCHEMA_NS}> .`,
    `@prefix arg: <${ARG_NS}> .`,
    `@prefix dc: <${DC_NS}> .`,
    `@prefix foaf: <${FOAF_NS}> .`,
];

function nodeToTurtle(id: string, type: string, name: string): string {
    const escapedName = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `arg:node/${id} a ${type} ;\n    schema:name "${escapedName}" .`;
}

function edgeToTurtle(source: string, target: string, labels: string[], index: number): string {
    const predicates = labels.map((l) => getEdgePredicate(l));
    const lines = [
        `arg:edge/${index} a arg:ArgumentRelation ;`,
        `    arg:source arg:node/${source} ;`,
        `    arg:target arg:node/${target} ;`,
        `    arg:relation ${predicates.join(', ')} .`,
    ];
    return lines.join('\n');
}

export function graphToTurtle(graph: Graph): string {
    const sections: string[] = [TURTLE_PREFIXES.join('\n')];

    for (const node of graph.nodes) {
        const id = String(node.id);
        const type = getNodeType(node.type);
        sections.push(nodeToTurtle(id, type, node.label));
    }

    graph.edges.forEach((edge, index) => {
        const labels = Array.isArray(edge.label) ? edge.label : [edge.label];
        sections.push(edgeToTurtle(String(edge.source), String(edge.target), labels, index));
    });

    return sections.join('\n\n') + '\n';
}
