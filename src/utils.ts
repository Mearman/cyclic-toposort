import { Edge, ReducedGraphResult } from "./types";

/**
 * Creates a deep copy of a Map where values are Sets.
 * Ensures that the Sets in the copied Map are new instances.
 * @param original The original Map<number, Set<number>> to copy.
 * @returns A new Map<number, Set<number>> with copied Sets.
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
 * Finds all nodes (keys) in a Map whose corresponding Set value is empty.
 * @param map The Map<number, Set<number>> to search within.
 * @returns A Set<number> containing nodes with empty Sets.
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
 * Removes specified nodes and their associated edges from node_ins and node_outs Maps.
 * Modifies the input Maps in place.
 * @param node_ins Map representing incoming edges (target -> Set<source>).
 * @param node_outs Map representing outgoing edges (source -> Set<target>).
 * @param nodesToRemove A Set<number> of nodes to remove.
 */
export function removeNodes(
	node_ins: Map<number, Set<number>>,
	node_outs: Map<number, Set<number>>,
	nodesToRemove: Set<number>
): void {
	// Remove nodes from the keys of both maps
	for (const node of nodesToRemove) {
		node_ins.delete(node);
		node_outs.delete(node);
	}

	// Remove nodes from the value Sets of node_ins
	for (const incomingSet of node_ins.values()) {
		for (const node of nodesToRemove) {
			incomingSet.delete(node);
		}
	}
	// Remove nodes from the value Sets of node_outs
	for (const outgoingSet of node_outs.values()) {
		for (const node of nodesToRemove) {
			outgoingSet.delete(node);
		}
	}
}

/**
 * Recreates a Set of edges ([start, end]) from a Map representing incoming edges.
 * @param node_ins Map representing incoming edges (target -> Set<source>).
 * @returns A Set<Edge> containing the reconstructed edges.
 */
export function recreateEdgesFromIns(
	node_ins: Map<number, Set<number>>
): Set<Edge> {
	const edges = new Set<Edge>();
	for (const [endNode, startNodes] of node_ins.entries()) {
		for (const startNode of startNodes) {
			edges.add([startNode, endNode]); // Add edge [start, end]
		}
	}
	return edges;
}

/**
 * Checks if two Sets are equal in terms of their elements.
 * Handles Sets of numbers or Sets of Edges (arrays of two numbers).
 * For Sets of Edges, it compares string representations after sorting.
 * @param setA The first Set.
 * @param setB The second Set.
 * @returns True if the Sets are equal, false otherwise.
 */
export function areSetsEqual<T>(setA: Set<T>, setB: Set<T>): boolean {
	if (setA.size !== setB.size) {
		return false;
	}

	// Check if elements are arrays (likely Edges)
	if (setA.size > 0 && setA.values().next().value instanceof Array) {
		// Convert sets of edges to sorted string arrays for comparison
		const arrayA = Array.from(setA as Set<Edge>)
			.map((edge) => edge.toString()) // Convert each edge to string
			.sort();
		const arrayB = Array.from(setB as Set<Edge>)
			.map((edge) => edge.toString()) // Convert each edge to string
			.sort();
		// Compare sorted string arrays element by element
		return arrayA.every((val, index) => val === arrayB[index]);
	}

	// For Sets of primitives (like numbers)
	for (const item of setA) {
		if (!setB.has(item)) {
			return false;
		}
	}
	return true;
}

/**
 * Generates an array of numbers from 0 to n-1.
 * @param n The upper limit (exclusive).
 * @returns An array of numbers [0, 1, ..., n-1].
 */
export function range(n: number): number[] {
	// Creates an array of length n, then maps index i to i
	return Array.from({ length: n }, (_, i) => i);
}

/**
 * Generates combinations of a specific size from an iterable.
 * @template T The type of elements in the iterable.
 * @param iterable An array or iterable of elements.
 * @param r The size of combinations to generate.
 * @returns An IterableIterator yielding arrays representing combinations.
 */
export function* combinations<T>(
	iterable: T[],
	r: number
): IterableIterator<T[]> {
	const pool = Array.from(iterable); // Ensure it's an array
	const n = pool.length;
	if (r > n || r < 0) {
		// Handle invalid combination size
		return;
	}
	const indices = range(r); // Initial indices [0, 1, ..., r-1]

	yield indices.map((i) => pool[i]); // Yield the first combination

	while (true) {
		let i = r - 1; // Start from the rightmost index

		// Find the rightmost index that can be incremented
		while (i >= 0 && indices[i] === i + n - r) {
			i--;
		}

		// If no index can be incremented, all combinations are generated
		if (i < 0) {
			return;
		}

		// Increment the found index
		indices[i]++;

		// Update subsequent indices
		for (let j = i + 1; j < r; j++) {
			indices[j] = indices[j - 1] + 1;
		}

		// Yield the new combination
		yield indices.map((idx) => pool[idx]);
	}
}

/**
 * Generates possible reduced graph states by iteratively removing edge subsets.
 * This is used in the cyclic toposort algorithm to explore states where
 * certain edges are assumed to be part of cycles.
 *
 * It prioritizes removing incoming edges to nodes with multiple incoming edges.
 * If no such nodes exist, it considers removing subsets of all remaining edges.
 *
 * @param edges The original Set<Edge> of the graph component.
 * @param node_ins Map representing incoming edges (target -> Set<source>).
 * @param node_outs Map representing outgoing edges (source -> Set<target>).
 * @returns An IterableIterator yielding ReducedGraphResult objects.
 *          Each result contains the modified node_ins, node_outs, and the
 *          set of edges that were 'forced' into a cycle (removed).
 */
export function* generate_reduced_ins_outs(
	edges: Set<Edge>,
	node_ins: Map<number, Set<number>>,
	node_outs: Map<number, Set<number>>
): IterableIterator<ReducedGraphResult> {
	let yielded_from_multi_in_nodes = false;

	// Prioritize nodes with multiple incoming edges
	for (const [node, incomingSet] of node_ins.entries()) {
		// Skip nodes with 0 or 1 incoming edge
		if (incomingSet.size <= 1) continue;

		yielded_from_multi_in_nodes = true;
		const incomingArray = Array.from(incomingSet);
		const numIncoming = incomingArray.length;

		// Generate combinations of incoming edges to remove (size 1 to numIncoming)
		for (let n = 1; n <= numIncoming; n++) {
			for (const subset_start_nodes of combinations(incomingArray, n)) {
				// Create the set of edges corresponding to the chosen incoming subset
				const subset_edges: Set<Edge> = new Set(
					subset_start_nodes.map((start) => [start, node] as Edge)
				);

				// Create deep copies of the maps to modify
				const modified_ins = deepCopyMapSet(node_ins);
				const modified_outs = deepCopyMapSet(node_outs);

				// Remove the selected edges from the copied maps
				for (const [start, end] of subset_edges) {
					modified_ins.get(end)?.delete(start);
					modified_outs.get(start)?.delete(end);
				}

				// Yield the result: modified maps and the removed edges
				yield {
					reduced_ins: modified_ins,
					reduced_outs: modified_outs,
					forced_cyclic_edges: subset_edges,
				};
			}
		}
	}

	// If no nodes with multiple incoming edges were found,
	// or if we need to explore further after exhausting those.
	// Consider removing subsets of *all* remaining edges.
	// Note: The original logic might have intended this as an 'else' block.
	// If yielded_from_multi_in_nodes is true, this part might generate
	// redundant states or states that are harder to resolve.
	// Keeping it for now as per original structure.
	if (!yielded_from_multi_in_nodes) {
		const edgeArray = Array.from(edges);
		const numEdges = edgeArray.length;

		// Generate combinations of *all* edges to remove (size 1 to numEdges)
		for (let n = 1; n <= numEdges; n++) {
			// combinations function needs an array of items, not indices directly
			// Let's get combinations of edges directly
			for (const subset_edges of combinations(edgeArray, n)) {
				// Create deep copies of the maps to modify
				const modified_ins = deepCopyMapSet(node_ins);
				const modified_outs = deepCopyMapSet(node_outs);

				// Remove the selected edges from the copied maps
				for (const [start, end] of subset_edges) {
					modified_ins.get(end)?.delete(start);
					modified_outs.get(start)?.delete(end);
				}

				// Yield the result: modified maps and the removed edges
				yield {
					reduced_ins: modified_ins,
					reduced_outs: modified_outs,
					forced_cyclic_edges: new Set(subset_edges), // Convert array to Set
				};
			}
		}
	}
}
