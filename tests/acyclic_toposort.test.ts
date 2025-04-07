import { describe, expect, it } from "vitest";
import { acyclic_toposort } from "../src/index";

describe("acyclic_toposort", () => {
	it("throws an error on cyclic graph", () => {
		const edges = new Set<[number, number]>([
			[1, 2],
			[2, 3],
			[3, 1],
		]);

		expect(() => acyclic_toposort(edges)).toThrow("Cyclic graph detected");
	});
});
