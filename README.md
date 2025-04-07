# cyclic-toposort-ts

**TypeScript implementation of topological sorting algorithms for cyclic and acyclic directed graphs.**

---

## Overview

This package provides two algorithms:

- **`acyclic_toposort`**: Sorts an **acyclic** directed graph into topological levels.
- **`cyclic_toposort`**: Handles **cyclic** graphs, returning a minimal set of edges causing cycles and a topological sort of the remaining acyclic graph.

A directed graph is represented as a collection of edges, where each edge is a tuple `[startNode, endNode]`.

<p align="center">
  <img src="./.illustrations/cyclic_toposort_graphs.svg" width="60%" alt="Example cyclic and acyclic graphs"/>
</p>

---

## Installation

```bash
npm install cyclic-toposort-ts
# or
yarn add cyclic-toposort-ts
```

---

## Usage

### Import

```typescript
import { acyclic_toposort, cyclic_toposort, Edge } from "cyclic-toposort-ts";
```

### Define edges

```typescript
const edges: Set<Edge> = new Set([
	[1, 2],
	[2, 3],
	[3, 5],
	[3, 6],
	[4, 1],
	[4, 5],
	[4, 6],
	[5, 2],
	[5, 7],
	[6, 1],
	[8, 6],
]);
```

### `cyclic_toposort` example

```typescript
const [topology, cyclicEdges] = cyclic_toposort(edges);
console.log(topology); // Array of Sets of node IDs (topological levels)
console.log(cyclicEdges); // Set of edges causing cycles
```

With a forced cyclic start node:

```typescript
const [topology2, cyclicEdges2] = cyclic_toposort(edges, 2);
console.log(topology2);
console.log(cyclicEdges2);
```

### `acyclic_toposort` example

```typescript
const acyclicEdges: Set<Edge> = new Set([
	[1, 2],
	[1, 3],
	[2, 3],
	[2, 4],
	[3, 4],
	[5, 3],
	[5, 6],
	[7, 6],
]);

const topology = acyclic_toposort(acyclicEdges);
console.log(topology);
```

---

## API

### Types

```typescript
type Edge = [number, number];

type Topology = Array<Set<number>>;

type CyclicResult = [Topology, Set<Edge>];
```

### Functions

#### `acyclic_toposort`

```typescript
function acyclic_toposort(edges: Iterable<Edge>): Topology;
```

- **edges**: Iterable of `[startNode, endNode]` tuples.
- **Returns**: `Topology` — array of node sets, each representing a topological level.
- **Throws**: Error if the graph contains cycles.

#### `cyclic_toposort`

```typescript
function cyclic_toposort(
	edges: Set<Edge>,
	start_node?: number | null
): CyclicResult;
```

- **edges**: Set of `[startNode, endNode]` tuples.
- **start_node** (optional): If provided, any edge leading into this node is treated as forced cyclic.
- **Returns**: Tuple:
  - `Topology`: array of node sets (topological levels).
  - `Set<Edge>`: minimal set of edges causing cycles.

---

## Building & Testing

- **Build:**
  ```bash
  npm run build
  ```
- **Run tests:**
  ```bash
  npm test
  ```

---

## License

MIT License © 2025
