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
