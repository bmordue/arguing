/**
 * Integration Example: Querying the Arguing API
 *
 * This example demonstrates how to interact with the Arguing API
 * using both REST endpoints and GraphQL.
 *
 * Prerequisites:
 *   1. Build the graph database: npm start -- --input example_graph.json --output arguing.sqlite
 *   2. Start the API server: npm run serve
 *   3. Run this example: node sdk/examples/query_graph.js
 */

'use strict';

const { ArguingClient, ArguingAPIError } = require('../javascript/arguing_client');

const client = new ArguingClient({
    baseUrl: 'http://localhost:3000',
    apiKey: process.env.ARGUING_API_KEY || 'arguing-dev-key-change-in-production'
});

async function main() {
    console.log('=== Arguing API Integration Example ===\n');

    // 1. Check server health
    console.log('1. Checking server health...');
    const healthRes = await fetch('http://localhost:3000/health');
    const health = await healthRes.json();
    console.log('   Status:', health.status, '\n');

    // 2. Get all nodes via REST
    console.log('2. Fetching all nodes (REST)...');
    const nodes = await client.getNodes();
    console.log(`   Found ${nodes.length} nodes`);
    nodes.slice(0, 3).forEach(n => console.log(`   - [${n.type || 'node'}] ${n.id}: ${n.label}`));
    if (nodes.length > 3) console.log(`   ... and ${nodes.length - 3} more`);
    console.log();

    // 3. Get all edges via REST
    console.log('3. Fetching all edges (REST)...');
    const edges = await client.getEdges();
    console.log(`   Found ${edges.length} edges`);
    edges.slice(0, 3).forEach(e => console.log(`   - ${e.source} -> ${e.target}`));
    if (edges.length > 3) console.log(`   ... and ${edges.length - 3} more`);
    console.log();

    // 4. Get graph as JSON-LD
    console.log('4. Fetching graph as JSON-LD...');
    const jsonLdGraph = await client.getGraph('application/ld+json');
    console.log('   JSON-LD @context keys:', Object.keys(jsonLdGraph['@context'] || {}).slice(0, 4).join(', '));
    console.log(`   Nodes: ${jsonLdGraph.nodes?.length ?? 0}, Edges: ${jsonLdGraph.edges?.length ?? 0}`);
    console.log();

    // 5. GraphQL query
    console.log('5. Querying via GraphQL...');
    const gqlResult = await client.graphqlQuery(`
        query {
            nodes {
                id
                label
                type
            }
            edges {
                source
                target
            }
        }
    `);
    const gqlNodes = gqlResult.data?.nodes ?? [];
    const gqlEdges = gqlResult.data?.edges ?? [];
    console.log(`   GraphQL returned ${gqlNodes.length} nodes and ${gqlEdges.length} edges`);
    console.log();

    // 6. Register a webhook
    console.log('6. Registering a webhook...');
    try {
        const webhook = await client.registerWebhook(
            'http://localhost:9999/webhook',  // Example endpoint
            ['graph.updated', 'node.created']
        );
        console.log(`   Registered webhook ID: ${webhook.id}`);
        console.log(`   Events: ${webhook.events.join(', ')}`);

        // List webhooks
        const hooks = await client.listWebhooks();
        console.log(`   Total registered webhooks: ${hooks.length}`);

        // Clean up
        await client.deleteWebhook(webhook.id);
        console.log(`   Webhook ${webhook.id} deleted`);
    } catch (err) {
        console.log(`   Note: ${err.message}`);
    }
    console.log();

    console.log('=== Example complete! ===');
}

main().catch(err => {
    if (err instanceof ArguingAPIError) {
        console.error(`API Error ${err.statusCode}: ${err.message}`);
    } else {
        console.error('Error:', err.message);
    }
    process.exit(1);
});
