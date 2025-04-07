// src/utils.ts
import { Edge, ReducedGraphResult } from "./types";

/**
 * Deep copies a Map where values are Sets.
 */
export function deepCopyMapSet(
	original: Map<number, Set<number>>
): Map<number, Set<number>> {
	const copy = new Map<number, Set<number>>();
	for (const [key, valueSet] of original.entries()) {
		copy.set(key, new Set(valueSet));
	}
	return copy;
}

/**
 * Finds nodes (keys) in a map whose associated Set value is empty.
 */
export function findNodesWithEmptySet(
	map: Map<number, Set<number>>
): Set<number> {
	const emptyNodes = new Set<number>();
	for (const [node, valueSet] of map.entries()) {
		if (valueSet.size === 0) {
			emptyNodes.add(node);
		}
	}
	return emptyNodes;
}

/**
 * Removes specified nodes from the node_ins and node_outs maps.
 * This involves removing them as keys and removing them from the value sets of other nodes.
 */
export function removeNodes(
	node_ins: Map<number, Set<number>>,
	node_outs: Map<number, Set<number>>,
	nodesToRemove: Set<number>
): void {
	// Remove nodes as keys
	for (const node of nodesToRemove) {
		node_ins.delete(node);
		node_outs.delete(node);
	}

	// Remove nodes from the value sets of remaining nodes
	for (const incomingSet of node_ins.values()) {
		for (const node of nodesToRemove) {
			incomingSet.delete(node);
		}
	}
	for (const outgoingSet of node_outs.values()) {
		for (const node of nodesToRemove) {
			outgoingSet.delete(node);
		}
	}
}

/**
 * Recreates a Set of Edges from a node_ins map.
 */
export function recreateEdgesFromIns(
	node_ins: Map<number, Set<number>>
): Set<Edge> {
	const edges = new Set<Edge>();
	for (const [endNode, startNodes] of node_ins.entries()) {
		for (const startNode of startNodes) {
			// Represent edge as a tuple for consistent comparison if needed later
			edges.add([startNode, endNode]);
		}
	}
	return edges;
}

/**
 * Checks if two sets contain the same elements.
 * For Sets of Edges, it compares the tuples element-wise.
 */
export function areSetsEqual<T>(setA: Set<T>, setB: Set<T>): boolean {
	if (setA.size !== setB.size) {
		return false;
	}

	// Special handling for Sets of Edges (tuples)
	if (setA.size > 0 && setA.values().next().value instanceof Array) {
		const arrayA = Array.from(setA as Set<Edge>)
			.map((edge) => edge.toString())
			.sort();
		const arrayB = Array.from(setB as Set<Edge>)
			.map((edge) => edge.toString())
			.sort();
		return arrayA.every((val, index) => val === arrayB[index]);
	}

	// Generic comparison for other types
	for (const item of setA) {
		if (!setB.has(item)) {
			return false;
		}
	}
	return true;
}

/**
 * Generates numbers from 0 to n-1.
 */
export function range(n: number): number[] {
	return Array.from({ length: n }, (_, i) => i);
}

/**
 * Generates combinations of size r from an iterable.
 */
export function* combinations<T>(
	iterable: T[],
	r: number
): IterableIterator<T[]> {
	const pool = Array.from(iterable);
	const n = pool.length;
	if (r > n) {
		return;
	}
	const indices = range(r);

	yield indices.map((i) => pool[i]); // Yield the first combination

	while (true) {
		let i = r - 1;
		// Find the rightmost index that can be incremented
		while (i >= 0 && indices[i] === i + n - r) {
			i--;
		}

		// If no such index exists, we are done
		if (i < 0) {
			return;
		}

		// Increment the index
		indices[i]++;

		// Update subsequent indices
		for (let j = i + 1; j < r; j++) {
			indices[j] = indices[j - 1] + 1;
		}

		yield indices.map((idx) => pool[idx]); // Yield the new combination
	}
}

/**
 * Generates all possible graphs by removing subsets of edges, treating them as cyclic.
 */
export function* generate_reduced_ins_outs(
	edges: Set<Edge>,
	node_ins: Map<number, Set<number>>,
	node_outs: Map<number, Set<number>>
): IterableIterator<ReducedGraphResult> {
	let yielded = false;

	// Prefer subsets of incoming edges for nodes with multiple incoming edges
	for (const [node, incomingSet] of node_ins.entries()) {
		if (incomingSet.size <= 1) continue;

		const incomingArray = Array.from(incomingSet);
		const numIncoming = incomingArray.length;

		for (let n = 1; n <= numIncoming; n++) {
			for (const subset of combinations(incomingArray, n)) {
				yielded = true;
				const subset_edges: Set<Edge> = new Set(
					subset.map((start) => [start, node] as Edge)
				);

				const modified_ins = deepCopyMapSet(node_ins);
				const modified_outs = deepCopyMapSet(node_outs);

				for (const [start, end] of subset_edges) {
					modified_ins.get(end)?.delete(start);
					modified_outs.get(start)?.delete(end);
				}

				yield {
					reduced_ins: modified_ins,
					reduced_outs: modified_outs,
					forced_cyclic_edges: subset_edges,
				};
			}
		}
	}

	// Fallback: if no such subsets were yielded, generate all edge subsets (brute-force)
	if (!yielded) {
		const edgeArray = Array.from(edges);
		const numEdges = edgeArray.length;

		for (let n = 1; n <= numEdges; n++) {
			for (const edgeSubsetIndices of combinations(range(numEdges), n)) {
				const subset_edges: Set<Edge> = new Set(
					edgeSubsetIndices.map((i) => edgeArray[i])
				);

				const modified_ins = deepCopyMapSet(node_ins);
				const modified_outs = deepCopyMapSet(node_outs);

				for (const [start, end] of subset_edges) {
					modified_ins.get(end)?.delete(start);
					modified_outs.get(start)?.delete(end);
				}

				yield {
					reduced_ins: modified_ins,
					reduced_outs: modified_outs,
					forced_cyclic_edges: subset_edges,
				};
			}
		}
	}
}
