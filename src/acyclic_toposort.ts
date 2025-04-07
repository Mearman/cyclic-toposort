import { Edge, Topology } from "./types";

export function acyclic_toposort(edges: Iterable<Edge>): Topology {
	const node_ins = new Map<number, Set<number>>();
	const all_nodes_tracker = new Set<number>();

	for (const [start, end] of edges) {
		all_nodes_tracker.add(start);
		all_nodes_tracker.add(end);

		if (start === end) {
			continue;
		}

		let incoming_set = node_ins.get(end);
		if (!incoming_set) {
			incoming_set = new Set<number>();
			node_ins.set(end, incoming_set);
		}
		incoming_set.add(start);
	}

	for (const node of all_nodes_tracker) {
		if (!node_ins.has(node)) {
			node_ins.set(node, new Set<number>());
		}
	}

	const graph_topology: Topology = [];

	while (true) {
		const dependencyless = new Set<number>();

		for (const node of all_nodes_tracker) {
			const incoming = node_ins.get(node);
			if (!incoming || incoming.size === 0) {
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
				break;
			} else {
				throw new Error("Cyclic graph detected during acyclic sort.");
			}
		}

		graph_topology.push(dependencyless);

		for (const [node, incoming_set] of node_ins.entries()) {
			if (!dependencyless.has(node)) {
				for (const dep_node of dependencyless) {
					incoming_set.delete(dep_node);
				}
			}
		}
	}

	return graph_topology;
}
