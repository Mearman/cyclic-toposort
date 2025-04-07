import { describe, expect, it } from "vitest";
import { cyclic_toposort } from "../src/index";

describe("cyclic_toposort", () => {
	it("handles a simple DAG", () => {
		const edges = new Set<[number, number]>([
			[1, 2],
			[2, 3],
		]);
		const [levels, cyclicEdges] = cyclic_toposort(edges);
		expect(levels).toEqual([new Set([1]), new Set([2]), new Set([3])]);
		expect(cyclicEdges.size).toBe(0);
	});

	it("handles a simple cycle", () => {
		const edges = new Set<[number, number]>([
			[1, 2],
			[2, 3],
			[3, 1],
		]);
		const [levels, cyclicEdges] = cyclic_toposort(edges);
		expect(levels.length).toBe(3);
		expect(cyclicEdges.size).toBe(1);
	});

	it("handles multiple minimal cycle options", () => {
		const edges = new Set<[number, number]>([
			[1, 2],
			[2, 1],
			[3, 4],
			[4, 3],
		]);
		const [levels, cyclicEdges] = cyclic_toposort(edges);
		expect(levels.length).toBeGreaterThanOrEqual(2);
		expect(cyclicEdges.size).toBe(2);
	});

	it("respects start_node option", () => {
		const edges = new Set<[number, number]>([
			[1, 2],
			[2, 3],
			[3, 1],
		]);
		const [levels, cyclicEdges] = cyclic_toposort(edges, 2);
		expect(levels.length).toBe(3);
		expect(cyclicEdges).toEqual(new Set([[1, 2]]));
	});

	it("handles empty graph", () => {
		const edges = new Set<[number, number]>();
		const [levels, cyclicEdges] = cyclic_toposort(edges);
		expect(levels).toEqual([]);
		expect(cyclicEdges.size).toBe(0);
	});

	it("ignores self loops", () => {
		const edges = new Set<[number, number]>([
			[1, 1],
			[1, 2],
		]);
		const [levels, cyclicEdges] = cyclic_toposort(edges);
		expect(levels).toEqual([new Set([1]), new Set([2])]);
		expect(cyclicEdges.size).toBe(0);
	});
});
