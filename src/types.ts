export type Edge = [number, number];
export type Topology = Array<Set<number>>;
export type CyclicResult = [Topology, Set<Edge>];

export type ReducedGraphResult = {
  reduced_ins: Map<number, Set<number>>;
  reduced_outs: Map<number, Set<number>>;
  forced_cyclic_edges: Set<Edge>;
};
