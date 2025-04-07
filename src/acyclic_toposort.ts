// src/acyclic_toposort.ts
import { Edge, Topology } from "./types";

/**
 * Topologically sorts a directed acyclic graph (DAG).
 * Nodes are grouped into sets representing levels of dependencies.
 *
 * @param edges An iterable of edges represented as [start_node, end_node].
 * @returns An array of sets, where each set contains nodes at the same topological level.
 * @throws Error if a cycle is detected in the graph.
 */
export function acyclic_toposort(edges: Iterable<Edge>): Topology {
	const node_ins = new Map<number, Set<number>>();
	const all_nodes_tracker = new Set<number>(); // Keep track of all nodes involved

	// Build the map of incoming edges (dependencies) for each node
	for (const [start, end] of edges) {
		// Track all nodes encountered
		all_nodes_tracker.add(start);
		all_nodes_tracker.add(end);

		if (start === end) {
			continue; // Ignore self-loops
		}

		// Ensure 'start' node exists in the map keys conceptually, even if it has no incoming edges itself
		// (We'll handle this when finding dependencyless nodes)

		// Get or create the set of incoming nodes for the 'end' node
		let incoming_set = node_ins.get(end);
		if (!incoming_set) {
			incoming_set = new Set<number>();
			node_ins.set(end, incoming_set);
		}
		incoming_set.add(start);
	}

	// Ensure all nodes are represented, even those with no incoming/outgoing edges listed explicitly
	// This is important for finding initial dependencyless nodes correctly.
	for (const node of all_nodes_tracker) {
		if (!node_ins.has(node)) {
			node_ins.set(node, new Set<number>());
		}
	}

	const graph_topology: Topology = [];

	while (true) {
		const dependencyless = new Set<number>();

		// Find nodes with no remaining dependencies
		// Iterate over all known nodes, not just keys in node_ins,
		// to catch nodes that only appeared as start nodes.
		for (const node of all_nodes_tracker) {
			const incoming = node_ins.get(node);
			// A node is dependencyless if it's not in node_ins (no incoming edges tracked)
			// or its set of incoming edges is now empty.
			if (!incoming || incoming.size === 0) {
				// Check if it was already processed in a previous level
				let already_processed = false;
				for (const level of graph_topology) {
					if (level.has(node)) {
						already_processed = true;
						break;
					}
				}
				if (!already_processed) {
					dependencyless.add(node);
				}
			}
		}

		if (dependencyless.size === 0) {
			// If no dependencyless nodes found, check if graph is fully processed or cyclic
			let remaining_nodes = false;
			for (const node of all_nodes_tracker) {
				let processed = false;
				for (const level of graph_topology) {
					if (level.has(node)) {
						processed = true;
						break;
					}
				}
				if (!processed) {
					remaining_nodes = true;
					break;
				}
			}

			if (!remaining_nodes) {
				break; // All nodes processed, successfully finished
			} else {
				// Nodes remain but none are dependencyless -> cycle detected
				throw new Error("Cyclic graph detected during acyclic sort.");
			}
		}

		// Add the found dependencyless nodes as the next level in the topology
		graph_topology.push(dependencyless);

		// Remove the processed nodes' dependencies from the remaining nodes
		for (const [node, incoming_set] of node_ins.entries()) {
			// Avoid modifying the set while iterating if the node itself is dependencyless
			if (!dependencyless.has(node)) {
				for (const dep_node of dependencyless) {
					incoming_set.delete(dep_node);
				}
			}
		}
		// Conceptually remove processed nodes (or mark them) - handled by checking graph_topology
	}

	return graph_topology;
}
