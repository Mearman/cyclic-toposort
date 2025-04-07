import { acyclic_toposort } from "./acyclic_toposort";
import { CyclicResult, Edge } from "./types";
import {
  areSetsEqual,
  deepCopyMapSet,
  findNodesWithEmptySet,
  generate_reduced_ins_outs,
  recreateEdgesFromIns,
  removeNodes,
} from "./utils";

function _cyclic_toposort_recursive(
	node_ins: Map<number, Set<number>>,
	node_outs: Map<number, Set<number>>
): Array<Set<Edge>> {
	const current_node_ins = deepCopyMapSet(node_ins);
	const current_node_outs = deepCopyMapSet(node_outs);

	let cyclic_edges_list: Array<Set<Edge>> = [new Set()];

	while (true) {
		const dependencyless_nodes = findNodesWithEmptySet(current_node_ins);
		if (dependencyless_nodes.size > 0) {
			removeNodes(current_node_ins, current_node_outs, dependencyless_nodes);
			if (current_node_ins.size === 0) {
				let actual_nodes_remaining = false;
				for (const _ of current_node_outs.keys()) {
					actual_nodes_remaining = true;
					break;
				}
				if (!actual_nodes_remaining) {
					return cyclic_edges_list;
				}
			}
			continue;
		}

		const followerless_nodes = findNodesWithEmptySet(current_node_outs);
		if (followerless_nodes.size > 0) {
			removeNodes(current_node_ins, current_node_outs, followerless_nodes);
			continue;
		} else {
			const current_edges = recreateEdgesFromIns(current_node_ins);
			if (current_edges.size === 0) {
				return cyclic_edges_list;
			}

			let min_cyclic_edges_count = Infinity;
			let new_cyclic_edges_list: Array<Set<Edge>> = [];

			const generator = generate_reduced_ins_outs(
				current_edges,
				current_node_ins,
				current_node_outs
			);

			for (const {
				reduced_ins,
				reduced_outs,
				forced_cyclic_edges,
			} of generator) {
				if (forced_cyclic_edges.size >= min_cyclic_edges_count) {
					continue;
				}

				const recursive_results = _cyclic_toposort_recursive(
					reduced_ins,
					reduced_outs
				);

				for (const reduced_cyclic_set of recursive_results) {
					const combined_cyclic_set = new Set<Edge>();
					forced_cyclic_edges.forEach((edge) => combined_cyclic_set.add(edge));
					reduced_cyclic_set.forEach((edge) => combined_cyclic_set.add(edge));

					const total_cyclic_count = combined_cyclic_set.size;

					if (total_cyclic_count < min_cyclic_edges_count) {
						min_cyclic_edges_count = total_cyclic_count;
						new_cyclic_edges_list = [combined_cyclic_set];
					} else if (total_cyclic_count === min_cyclic_edges_count) {
						let is_present = false;
						for (const existing_set of new_cyclic_edges_list) {
							if (areSetsEqual(existing_set, combined_cyclic_set)) {
								is_present = true;
								break;
							}
						}
						if (!is_present) {
							new_cyclic_edges_list.push(combined_cyclic_set);
						}
					}
				}
			}
			return new_cyclic_edges_list;
		}
	}
}

export function cyclic_toposort(
	edges: Set<Edge>,
	start_node: number | null = null
): CyclicResult {
	const node_ins = new Map<number, Set<number>>();
	const node_outs = new Map<number, Set<number>>();
	const cyclic_edges_forced = new Set<Edge>();
	const all_nodes = new Set<number>();

	for (const edge of edges) {
		const [start, end] = edge;
		all_nodes.add(start);
		all_nodes.add(end);

		if (start === end) {
			continue;
		}

		if (!node_ins.has(end)) node_ins.set(end, new Set());
		if (!node_outs.has(start)) node_outs.set(start, new Set());
		if (!node_ins.has(start)) node_ins.set(start, new Set());
		if (!node_outs.has(end)) node_outs.set(end, new Set());

		if (start_node !== null && end === start_node) {
			cyclic_edges_forced.add(edge);
			continue;
		}

		node_ins.get(end)!.add(start);
		node_outs.get(start)!.add(end);
	}

	for (const node of all_nodes) {
		if (!node_ins.has(node)) node_ins.set(node, new Set());
		if (!node_outs.has(node)) node_outs.set(node, new Set());
	}

	if (start_node !== null && !all_nodes.has(start_node)) {
		if (!node_ins.has(start_node!)) node_ins.set(start_node!, new Set());
		if (!node_outs.has(start_node!)) node_outs.set(start_node!, new Set());
		all_nodes.add(start_node!);
	}

	const list_of_cyclic_edge_sets = _cyclic_toposort_recursive(
		node_ins,
		node_outs
	);

	const possible_results: Array<CyclicResult> = [];

	for (const cyclic_edge_set of list_of_cyclic_edge_sets) {
		const combined_cyclic_edges = new Set<Edge>();
		cyclic_edge_set.forEach((edge) => combined_cyclic_edges.add(edge));
		cyclic_edges_forced.forEach((edge) => combined_cyclic_edges.add(edge));

		const current_edges_for_acyclic_sort = new Set<Edge>();
		for (const edge of edges) {
			let is_cyclic = false;
			for (const cyclic_edge of combined_cyclic_edges) {
				if (edge[0] === cyclic_edge[0] && edge[1] === cyclic_edge[1]) {
					is_cyclic = true;
					break;
				}
			}
			if (!is_cyclic) {
				current_edges_for_acyclic_sort.add(edge);
			}
		}

		try {
			const topology = acyclic_toposort(current_edges_for_acyclic_sort);
			possible_results.push([topology, combined_cyclic_edges]);
		} catch (error) {
			console.error(
				"Acyclic sort failed after removing supposed cyclic edges. This might indicate an issue.",
				{
					error,
					removed_edges: Array.from(combined_cyclic_edges),
					edges_tried: Array.from(current_edges_for_acyclic_sort),
				}
			);
		}
	}

	if (possible_results.length === 0) {
		throw new Error(
			"Could not find a valid topological sort after cycle removal attempts."
		);
	}

	let best_result = possible_results[0];
	let best_score = -Infinity;

	for (const result of possible_results) {
		const cyclic_edges = result[1];
		let score = 0;
		for (const [start, end] of cyclic_edges) {
			const indegree = node_ins.get(end)?.size ?? 0;
			score += indegree;
		}
		if (score > best_score) {
			best_score = score;
			best_result = result;
		}
	}

	return best_result;
}
