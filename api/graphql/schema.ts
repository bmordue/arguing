import {
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull
} from 'graphql';
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';

const NodeType = new GraphQLObjectType({
    name: 'Node',
    description: 'An argument node in the graph',
    fields: {
        id: { type: new GraphQLNonNull(GraphQLString), description: 'Unique node identifier' },
        label: { type: new GraphQLNonNull(GraphQLString), description: 'The text content of the argument component' },
        type: { type: GraphQLString, description: 'Type of argument component (claim, premise, conclusion, rebuttal)' }
    }
});

const EdgePropertiesType = new GraphQLObjectType({
    name: 'EdgeProperties',
    description: 'Properties of a graph edge',
    fields: {
        source: { type: new GraphQLNonNull(GraphQLString), description: 'Source node ID' },
        target: { type: new GraphQLNonNull(GraphQLString), description: 'Target node ID' },
        properties: { type: GraphQLString, description: 'JSON string of edge labels/properties' }
    }
});

const GraphType = new GraphQLObjectType({
    name: 'Graph',
    description: 'The complete argument graph',
    fields: {
        nodes: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(NodeType))) },
        edges: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EdgePropertiesType))) }
    }
});

export function createGraphQLSchema(db: Database<sqlite3.Database, sqlite3.Statement>): GraphQLSchema {
    const QueryType = new GraphQLObjectType({
        name: 'Query',
        fields: {
            nodes: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(NodeType))),
                description: 'List all argument nodes',
                resolve: async () => {
                    const rows = await db.all('SELECT body FROM nodes');
                    return rows.map(row => JSON.parse(row.body));
                }
            },
            node: {
                type: NodeType,
                description: 'Get a specific node by ID',
                args: {
                    id: { type: new GraphQLNonNull(GraphQLString), description: 'Node ID to look up' }
                },
                resolve: async (_: unknown, args: { id: string }) => {
                    const row = await db.get('SELECT body FROM nodes WHERE id = ?', args.id);
                    if (!row) return null;
                    return JSON.parse(row.body);
                }
            },
            edges: {
                type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(EdgePropertiesType))),
                description: 'List all edges in the argument graph',
                resolve: async () => {
                    const rows = await db.all('SELECT source, target, properties FROM edges');
                    return rows.map(row => ({
                        source: row.source,
                        target: row.target,
                        properties: row.properties
                    }));
                }
            },
            graph: {
                type: new GraphQLNonNull(GraphType),
                description: 'Get the full argument graph',
                resolve: async () => {
                    const nodeRows = await db.all('SELECT body FROM nodes');
                    const edgeRows = await db.all('SELECT source, target, properties FROM edges');
                    return {
                        nodes: nodeRows.map(row => JSON.parse(row.body)),
                        edges: edgeRows.map(row => ({
                            source: row.source,
                            target: row.target,
                            properties: row.properties
                        }))
                    };
                }
            }
        }
    });

    return new GraphQLSchema({ query: QueryType });
}
