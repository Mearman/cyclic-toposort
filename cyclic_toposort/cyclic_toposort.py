"""Module providing functions for sorting directed graphs, identifying all cyclic edges."""

# Original license retained for parts of the structure.
# Copyright (c) 2020 Paul Pauls.
# Substantial modifications made to implement SCC-based cycle detection.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

from collections import defaultdict

from cyclic_toposort.acyclic_toposort import acyclic_toposort


def _find_cyclic_edges_scc(nodes: set[int], edges: set[tuple[int, int]]) -> set[tuple[int, int]]:
    """
    Identifies all edges involved in cycles using Tarjan's algorithm for Strongly Connected Components (SCCs).
    Includes self-loops.

    :param nodes: A set of all nodes in the graph.
    :param edges: A set of tuples representing directed edges (start_node, end_node).
    :return: A set of all edges that are part of any cycle.
    """
    adj = defaultdict(list)
    for u, v in edges:
        # Ensure nodes exist even if they only appear in edges
        nodes.add(u)
        nodes.add(v)
        adj[u].append(v)

    index_counter = 0
    stack: list[int] = []
    on_stack: set[int] = set()
    indices: dict[int, int] = {}
    low_links: dict[int, int] = {}
    sccs: list[set[int]] = []
    cyclic_edges_scc: set[tuple[int, int]] = set()

    def strongconnect(node: int) -> None:
        nonlocal index_counter
        indices[node] = index_counter
        low_links[node] = index_counter
        index_counter += 1
        stack.append(node)
        on_stack.add(node)

        for neighbor in adj.get(node, []):
            if neighbor not in indices:
                strongconnect(neighbor)
                low_links[node] = min(low_links[node], low_links[neighbor])
            elif neighbor in on_stack:
                low_links[node] = min(low_links[node], indices[neighbor])

        if low_links[node] == indices[node]:
            scc: set[int] = set()
            while True:
                node_in_scc = stack.pop()
                on_stack.remove(node_in_scc)
                scc.add(node_in_scc)
                if node == node_in_scc:
                    break
            if len(scc) > 1:
                sccs.append(scc)
            # Check for self-loops within this potential SCC (even if size 1)
            if node in adj.get(node, []):
                 cyclic_edges_scc.add((node, node))


    for node in nodes:
        if node not in indices:
            strongconnect(node)

    # Identify edges within SCCs
    scc_map = {node: i for i, scc in enumerate(sccs) for node in scc}
    for u, v in edges:
        if u == v:
            cyclic_edges_scc.add((u, v))
        # Check if both nodes are in the *same* multi-node SCC
        elif u in scc_map and v in scc_map and scc_map[u] == scc_map[v]:
            cyclic_edges_scc.add((u, v))

    return cyclic_edges_scc


def cyclic_toposort(
    nodes: set[int],
    edges: set[tuple[int, int]],
    start_node: int | None = None,
) -> tuple[list[set[int]], set[tuple[int, int]]]:
    """
    Performs a topological sort on a potentially cyclic graph.

    Identifies *all* edges participating in any cycle (including self-loops)
    using Tarjan's algorithm for Strongly Connected Components (SCCs).
    Returns the topological sorting of the graph after removing these cyclic edges,
    and the set of all identified cyclic edges. Handles isolated nodes correctly.

    :param nodes: A set of all nodes in the graph. Nodes not present in edges will be treated as isolated.
    :param edges: A set of tuples where each tuple represents a directed edge (start_node, end_node).
    :param start_node: An optional node. If provided, any edge leading *into* this node will be *additionally*
                       considered cyclic, even if not part of a natural cycle found by SCC.
    :return: A tuple containing:
        - A list of sets representing the topological ordering of nodes after removing all cyclic edges.
          Each set contains nodes at the same depth. Includes isolated nodes.
        - A set of tuples representing *all* edges identified as part of a cycle (via SCC or self-loop)
          or forced cyclic due to the `start_node` constraint.
    """
    # Ensure all nodes from edges are included in the nodes set
    all_nodes = set(nodes)
    for u, v in edges:
        all_nodes.add(u)
        all_nodes.add(v)

    # Find all edges involved in natural cycles (SCCs and self-loops)
    cyclic_edges_found = _find_cyclic_edges_scc(all_nodes.copy(), edges) # Pass copy as SCC modifies it

    # Add edges forced cyclic by start_node constraint
    forced_cyclic_edges: set[tuple[int, int]] = set()
    if start_node is not None:
        if start_node not in all_nodes:
             pass
        else:
            for u, v in edges:
                if v == start_node:
                    forced_cyclic_edges.add((u, v))

    # Combine naturally cyclic edges and forced cyclic edges
    all_cyclic_edges = cyclic_edges_found.union(forced_cyclic_edges)

    # Determine edges for the acyclic sort
    acyclic_edges = edges - all_cyclic_edges

    # Perform acyclic topological sort on the remaining graph
    topology = acyclic_toposort(all_nodes, acyclic_edges)

    return topology, all_cyclic_edges
