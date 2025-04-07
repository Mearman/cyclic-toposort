"""Module providing functions for sorting directed acyclic graphs."""

# Copyright (c) 2020 Paul Pauls.
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

from collections.abc import Iterable


def acyclic_toposort(nodes: set[int], edges: Iterable[tuple[int, int]]) -> list[set[int]]:
    """Create and return a topological sorting of an acyclic graph as a list of sets, each set representing a
    topological level, starting with the nodes that have no dependencies.

    :param nodes: A set of all nodes in the graph.
    :param edges: iterable of edges represented as 2-tuples, whereas each 2-tuple represents the start-index and end-
        index of an edge
    :return: topological sorting of the graph represented by the input nodes and edges as a list of sets that represent
        each topological level in order beginning with all dependencyless nodes.
    :raises RuntimeError: if a cyclic graph is detected (should not happen if called after cycle removal).
    """
    # Create dict that associates each node with the set of all nodes that having an incoming edge (node_ins) to
    # that particular node. If a node has no incoming connections will the node be associated with an empty set.
    # Initialize node_ins with all nodes to handle isolated nodes correctly.
    node_ins: dict[int, set[int]] = {node: set() for node in nodes}
    # Populate node_ins based on the provided edges.
    # Nodes not in edges but present in the 'nodes' set will retain their empty 'incomings' set.
    for edge_start, edge_end in edges:
        # Self-loops and other cyclic edges should have been removed by the caller.
        # If edge_end is not in node_ins it means the edge references a node not in the initial 'nodes' set.
        # This could be an error in the input, but we'll proceed assuming nodes are correct.
        # If edge_start is not in node_ins, it's handled implicitly as it won't have incomings added.
        if edge_end in node_ins:
            node_ins[edge_end].add(edge_start)

    # Create the topological sorting of the graph represented by the input edges as a list of sets that represent each
    # topological level in order beginning with all dependencyless nodes.
    graph_topology: list[set[int]] = []
    while True:
        # Determine all nodes having no input/dependency in the current topological level
        dependencyless = {node for node, incomings in node_ins.items() if not incomings}

        if not dependencyless:
            # If node_ins is not empty, it means we have a cycle
            if node_ins:
                raise RuntimeError("Cyclic graph detected in acyclic_toposort function")
            # Otherwise, we've processed all nodes
            break

        # Set dependencyless nodes as the nodes of the next topological level
        graph_topology.append(dependencyless)

        # Remove dependencyless nodes from node_ins collection, as those dependencyless nodes have been placed.
        for node in dependencyless:
            del node_ins[node]

        # If all nodes are placed, exit topological sorting
        if not node_ins:
            break

        node_ins = {node: incomings - dependencyless for node, incomings in node_ins.items()}

    return graph_topology
