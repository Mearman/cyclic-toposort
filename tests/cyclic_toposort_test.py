import pytest
import json
import pathlib
from cyclic_toposort import cyclic_toposort

FIXTURE_DIR = pathlib.Path(__file__).parent / "fixtures"


def load_fixture_data(file_path: pathlib.Path):
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
            if "graph" not in data or "expected" not in data:
                print(f"Warning: Skipping {file_path.name}. Missing 'graph' or 'expected' key.")
                return None
            return data
    except json.JSONDecodeError:
        print(f"Warning: Could not decode JSON from {file_path.name}")
        return None
    except Exception as e:
        print(f"Warning: Error loading {file_path.name}: {e}")
        return None


def get_test_fixtures():
    fixtures = []
    if not FIXTURE_DIR.is_dir():
        print(f"Warning: Fixture directory not found: {FIXTURE_DIR}")
        return fixtures  # Return empty list if directory doesn't exist

    for file_path in FIXTURE_DIR.glob("*.json"):
        fixture_data = load_fixture_data(file_path)
        if fixture_data:
            test_id = file_path.stem
            fixtures.append(pytest.param(file_path.name, fixture_data, id=test_id))
    return fixtures


@pytest.mark.parametrize("filename, fixture_data", get_test_fixtures())
def test_cyclic_toposort_from_fixture(filename, fixture_data):
    print(f"\nTesting with fixture: {filename}")

    adj_list = fixture_data["graph"]
    expected_cyclic_edges_raw = fixture_data["expected"]
    expected_topology_raw = fixture_data.get("topology", [])

    edges = set()
    all_nodes = set(adj_list.keys())
    for start_node, neighbors in adj_list.items():
        start_node_str = str(start_node)
        all_nodes.add(start_node_str)
        if not isinstance(neighbors, list):
            print(f"Warning: Neighbors for node '{start_node_str}' in {filename} is not a list. Skipping node.")
            continue
        for neighbor in neighbors:
            neighbor_str = str(neighbor)
            edges.add((start_node_str, neighbor_str))
            all_nodes.add(neighbor_str)

    topology, result_cyclic_edges_set = cyclic_toposort(all_nodes, edges)

    expected_cyclic_edges_set = {tuple(map(str, edge)) for edge in expected_cyclic_edges_raw}

    print(f"  Edges: {edges}")
    print(f"  Expected Cyclic Edges: {expected_cyclic_edges_set}")
    print(f"  Result Cyclic Edges: {result_cyclic_edges_set}")
    assert result_cyclic_edges_set == expected_cyclic_edges_set, f"Cyclic edges mismatch for {filename}"

    expected_topology_processed = []
    for level in expected_topology_raw:
        expected_topology_processed.append(sorted(list(map(str, level))))

    result_topology_processed = [sorted(list(map(str, level))) for level in topology]

    print(f"  Expected Topology: {expected_topology_processed}")
    print(f"  Result Topology: {result_topology_processed}")
    assert sorted(result_topology_processed) == sorted(expected_topology_processed), f"Topology mismatch for {filename}"
