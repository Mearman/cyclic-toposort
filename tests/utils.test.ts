import { describe, expect, it } from "vitest";
import { acyclic_toposort, cyclic_toposort } from "../src/index";
import {
  areSetsEqual,
  combinations,
  deepCopyMapSet,
  generate_reduced_ins_outs,
} from "../src/utils";

describe("generate_reduced_ins_outs", () => {
	it("yields correct sequence for small graph", () => {
		const edges = new Set<[number, number]>([
			[1, 2],
			[2, 3],
		]);

		const results = Array.from(
			generate_reduced_ins_outs(edges, new Map(), new Map())
		);

		expect(results.length).toBe(3);

		const forcedEdgesSets = results.map((r) => r.forced_cyclic_edges);
		expect(forcedEdgesSets[0]).toEqual(new Set([[1, 2]]));
		expect(forcedEdgesSets[1]).toEqual(new Set([[2, 3]]));
		expect(forcedEdgesSets[2]).toEqual(
			new Set([
				[1, 2],
				[2, 3],
			])
		);
	});

	it("yields nothing for empty graph", () => {
		const edges = new Set<[number, number]>();
		const results = Array.from(
			generate_reduced_ins_outs(edges, new Map(), new Map())
		);
		expect(results.length).toBe(0);
	});
});

describe("input immutability", () => {
	it("does not modify input edges in acyclic_toposort", () => {
		const edges = new Set<[number, number]>([
			[1, 2],
			[2, 3],
		]);
		const original = new Set(edges);
		acyclic_toposort(edges);
		expect(edges).toEqual(original);
	});

	it("does not modify input edges in cyclic_toposort", () => {
		const edges = new Set<[number, number]>([
			[1, 2],
			[2, 3],
		]);
		const original = new Set(edges);
		cyclic_toposort(edges);
		expect(edges).toEqual(original);
	});
});

describe("deepCopyMapSet", () => {
	it("creates a deep copy of Map<number, Set<number>>", () => {
		const map = new Map<number, Set<number>>([
			[1, new Set([2, 3])],
			[2, new Set([4])],
		]);
		const copy = deepCopyMapSet(map);
		expect(copy).not.toBe(map);
		expect(copy.get(1)).not.toBe(map.get(1));
		copy.get(1)?.add(99);
		expect(map.get(1)?.has(99)).toBe(false);
	});
});

describe("areSetsEqual", () => {
	it("compares sets of numbers", () => {
		const a = new Set([1, 2, 3]);
		const b = new Set([3, 2, 1]);
		const c = new Set([1, 2]);
		expect(areSetsEqual(a, b)).toBe(true);
		expect(areSetsEqual(a, c)).toBe(false);
	});

	it("compares sets of tuple arrays", () => {
		const a = new Set<string>(["1,2", "2,3"]);
		const b = new Set<string>(["2,3", "1,2"]);
		const c = new Set<string>(["1,2"]);
		expect(areSetsEqual(a, b)).toBe(true);
		expect(areSetsEqual(a, c)).toBe(false);
	});
});

describe("combinations", () => {
	it("generates combinations of array elements", () => {
		const arr = [1, 2, 3];
		const combs = Array.from(combinations(arr, 2));
		expect(combs).toEqual([
			[1, 2],
			[1, 3],
			[2, 3],
		]);
	});
});
