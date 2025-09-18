import React from 'react';
import { Card } from './components/Card';
import graph from '../example_graph.json';
import './ArgumentMap.css';

interface Node {
    id: string | number;
    label: string;
    type?: string;
}

interface Edge {
    source: string | number;
    target: string | number;
    label: string | string[];
}

interface Graph {
    nodes: Node[];
    edges: Edge[];
}

const ArgumentMap: React.FC = () => {
    const data: Graph = graph;

    const nodesById = data.nodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
    }, {} as Record<string | number, Node>);

    return (
        <div className="argument-map-container">
            <h1>Argument Map</h1>
            <div className="argument-map">
                {data.nodes.map((node) => (
                    <Card key={node.id} title={node.type || 'Node'}>
                        {node.label}
                    </Card>
                ))}
            </div>
            <div className="relationships">
                <h2>Relationships</h2>
                <ul>
                    {data.edges.map((edge, index) => {
                        const sourceNode = nodesById[edge.source];
                        const targetNode = nodesById[edge.target];
                        if (!sourceNode || !targetNode) {
                            return null;
                        }
                        return (
                            <li key={index}>
                                <strong>{sourceNode.label}</strong>
                                <em> --[{Array.isArray(edge.label) ? edge.label.join(', ') : edge.label}]--&gt; </em>
                                <strong>{targetNode.label}</strong>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default ArgumentMap;
