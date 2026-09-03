"""
RingDetector — Person 2 (ML - GNN)

Pure NetworkX structural heuristics for detecting circular routing rings,
device-sharing syndicates, collection hubs, and multi-hop layering depth.

These signals complement the GAT attention scores with deterministic
topology analysis that is interpretable by compliance investigators.
"""

from typing import Dict, Any, List
import networkx as nx
from datetime import datetime


class RingDetector:
    """
    Analyses an account's neighbourhood for AML ring-topology patterns.

    Pattern library:
        - Circular routing     : directed cycles in the ego subgraph
        - Device syndicate     : SHARES_DEVICE edges to ≥2 accounts
        - Collection hub       : in-degree > 4 in causal filtered graph
        - Layering depth       : longest shortest path from focus node
    """

    HUB_THRESHOLD       = 4    # in-degree above which account is a collection hub
    SYNDICATE_MIN_PEERS = 2    # number of device-sharing peers to trigger syndicate flag

    def analyse(
        self,
        account_id: str,
        graph: nx.MultiDiGraph,
        as_of_timestamp: str,
        hops: int = 3
    ) -> Dict[str, Any]:
        """
        Returns a dict with ring topology signals:
            in_ring           : bool  — account is part of a directed cycle
            cycle_length      : int   — length of shortest detected cycle (0 if none)
            device_syndicate  : bool  — account shares device with ≥ SYNDICATE_MIN_PEERS
            syndicate_accounts: list  — peer account ids in device syndicate
            is_hub            : bool  — account is a high fan-in collection hub
            layering_depth    : int   — longest detectable layering hop chain
            signals           : list  — plain-English forensic signal strings
        """
        result = {
            "in_ring": False,
            "cycle_length": 0,
            "device_syndicate": False,
            "syndicate_accounts": [],
            "is_hub": False,
            "layering_depth": 0,
            "signals": []
        }

        if not graph.has_node(account_id):
            return result

        # ---- Build causal subgraph ----
        try:
            as_of_dt = _parse_iso(as_of_timestamp)
        except Exception:
            as_of_dt = None

        # Extract nodes reachable within `hops` in either direction
        undirected = graph.to_undirected(reciprocal=False)
        try:
            reachable = set(
                nx.single_source_shortest_path_length(undirected, account_id, cutoff=hops).keys()
            )
        except Exception:
            reachable = {account_id}

        # Causal edge filter
        causal_g = nx.DiGraph()
        device_g = nx.Graph()

        for u, v, k, data in graph.edges(data=True, keys=True):
            if u not in reachable and v not in reachable:
                continue
            edge_ts = data.get("timestamp")
            if edge_ts and as_of_dt:
                try:
                    if _parse_iso(edge_ts) >= as_of_dt:
                        continue
                except Exception:
                    pass

            edge_type = data.get("edge_type", "TRANSACTED_WITH")
            if edge_type == "SHARES_DEVICE":
                device_id = data.get("device_id", "unknown")
                device_g.add_edge(u, v, device_id=device_id)
            else:
                causal_g.add_edge(u, v, **data)

        # ---- 1. Circular routing detection ----
        if causal_g.has_node(account_id):
            try:
                # Detect simple cycles that include account_id
                for cycle in nx.simple_cycles(causal_g):
                    if account_id in cycle:
                        result["in_ring"] = True
                        result["cycle_length"] = len(cycle)
                        result["signals"].append(
                            f"Account is part of a {len(cycle)}-node circular routing ring: "
                            + " → ".join(cycle[:4]) + (" → ..." if len(cycle) > 4 else "")
                        )
                        break  # first cycle is enough for scoring
            except Exception:
                pass

        # ---- 2. Device syndicate detection ----
        if device_g.has_node(account_id):
            peers = list(device_g.neighbors(account_id))
            if len(peers) >= self.SYNDICATE_MIN_PEERS:
                result["device_syndicate"] = True
                result["syndicate_accounts"] = peers
                # Find shared device id
                shared_devices = set()
                for peer in peers:
                    edge_data = device_g.get_edge_data(account_id, peer, {})
                    if isinstance(edge_data, dict):
                        did = edge_data.get("device_id", "unknown")
                        shared_devices.add(did)
                result["signals"].append(
                    f"Device sharing syndicate: account links to {len(peers)} peers "
                    f"via device(s) [{', '.join(list(shared_devices)[:2])}]."
                )

        # ---- 3. Collection hub (high fan-in) detection ----
        if causal_g.has_node(account_id):
            in_deg = causal_g.in_degree(account_id)
            if in_deg >= self.HUB_THRESHOLD:
                result["is_hub"] = True
                result["signals"].append(
                    f"Fan-in collection hub: {in_deg} distinct senders in causal window — "
                    "consistent with smurfing aggregation node."
                )

        # ---- 4. Layering depth (longest forward-reach from account) ----
        if causal_g.has_node(account_id):
            try:
                lengths = nx.single_source_shortest_path_length(causal_g, account_id)
                if lengths:
                    max_depth = max(lengths.values())
                    result["layering_depth"] = int(max_depth)
            except Exception:
                pass

        return result


def _parse_iso(ts: str) -> datetime:
    """Robust ISO-8601 parser."""
    ts = ts.rstrip("Z").replace("T", " ")
    for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(ts, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse timestamp: {ts}")


ring_detector = RingDetector()
