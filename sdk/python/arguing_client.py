"""
Arguing API Python Client SDK

A simple Python client for the Arguing REST API.
Uses only Python standard library - no external dependencies required.

Example usage:
    client = ArguingClient(base_url='http://localhost:3000', api_key='your-api-key')
    graph = client.get_graph()
    nodes = client.get_nodes()
    node = client.get_node('1')
"""

import json
import urllib.request
import urllib.error
from typing import Any, Optional


class ArguingAPIError(Exception):
    """Exception raised for API errors."""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"API Error {status_code}: {message}")


class ArguingClient:
    """Client for the Arguing REST API."""

    def __init__(self, base_url: str = 'http://localhost:3000', api_key: str = ''):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.api_base = f"{self.base_url}/api/v1"

    def _request(self, path: str, method: str = 'GET', body: Optional[dict] = None,
                 accept: str = 'application/json') -> Any:
        url = f"{self.api_base}{path}"
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Accept': accept,
            'Content-Type': 'application/json',
        }
        data = json.dumps(body).encode('utf-8') if body else None
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req) as response:
                raw = response.read().decode('utf-8')
                if 'json' in response.headers.get('Content-Type', ''):
                    return json.loads(raw)
                return raw
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            try:
                error_data = json.loads(error_body)
                msg = error_data.get('message', error_body)
            except Exception:
                msg = error_body
            raise ArguingAPIError(e.code, msg) from e

    def get_nodes(self, accept: str = 'application/json') -> list:
        """Get all nodes in the argument graph."""
        result = self._request('/nodes', accept=accept)
        return result.get('nodes', []) if isinstance(result, dict) else result

    def get_node(self, node_id: str) -> dict:
        """Get a specific node by ID."""
        return self._request(f'/nodes/{node_id}')

    def get_edges(self) -> list:
        """Get all edges in the argument graph."""
        result = self._request('/edges')
        return result.get('edges', [])

    def get_edges_by_source(self, source_id: str) -> list:
        """Get all edges from a specific source node."""
        result = self._request(f'/edges/filter?source={source_id}')
        return result.get('edges', [])

    def get_edges_by_target(self, target_id: str) -> list:
        """Get all edges to a specific target node."""
        result = self._request(f'/edges/filter?target={target_id}')
        return result.get('edges', [])

    def get_graph(self) -> dict:
        """Get the full argument graph (nodes and edges)."""
        return self._request('/graph')

    def register_webhook(self, url: str, events: list, secret: Optional[str] = None) -> dict:
        """Register a webhook for event notifications."""
        body = {'url': url, 'events': events}
        if secret:
            body['secret'] = secret
        return self._request('/webhooks', method='POST', body=body)

    def list_webhooks(self) -> list:
        """List all registered webhooks."""
        result = self._request('/webhooks')
        return result.get('webhooks', [])

    def delete_webhook(self, webhook_id: str) -> None:
        """Delete a registered webhook."""
        self._request(f'/webhooks/{webhook_id}', method='DELETE')

    def graphql_query(self, query: str, variables: Optional[dict] = None) -> dict:
        """Execute a GraphQL query."""
        body = json.dumps({'query': query, 'variables': variables or {}}).encode('utf-8')
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        url = f"{self.base_url}/graphql"
        request = urllib.request.Request(url, data=body, headers=headers, method='POST')
        with urllib.request.urlopen(request) as response:
            return json.loads(response.read().decode('utf-8'))
