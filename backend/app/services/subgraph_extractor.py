"""
SubgraphExtractor — Person 2 (ML - GNN)

Converts a MemoryGraph ego-subgraph dict (nodes + links) into a PyTorch Geometric
Data object suitable for direct GAT inference.

Node feature vector (16-dim):
  [0]  in_degree_ratio          — fraction of edges that are incoming
  [1]  out_degree_ratio         — fraction of edges that are outgoing
  [2]  log_total_degree         — log(1 + total degree)
  [3]  flow_imbalance           — |inflow - outflow| / (inflow + outflow)
  [4]  fan_in_out_ratio         — in-degree / max(1, out-degree)
  [5]  degree_vs_time_mean      — transaction count (capped at 10)
  [6]  extreme_feature_count_2  — count of features at 80th+ percentile
  [7]  extreme_feature_count_3  — count of features at 95th+ percentile
  [8]  feature_mean             — normalised edge-amount mean
  [9]  feature_std              — amount standard deviation
  [10] is_focus                 — 1.0 if this is the focal account node
  [11] mean_edge_attention       — mean GAT attention from prior runs
  [12] max_edge_amount           — max transaction amount in ego-window
  [13] has_risky_edge            — 1.0 if any adjacent edge is flagged risky
  [14] risky_edge_fraction       — fraction of edges that are risky
  [15] betweenness_proxy         — node degree / max_degree in subgraph (proxy)
"""

from typing import Dict, Any, List, Tuple
import numpy as np
import torch
from torch_geometric.data import Data


class SubgraphExtractor:
    """
    Converts an in-memory ego-subgraph dict to a PyG Data object
    with 16-dim node features and directed edge_index.
    """

    FEATURE_DIM = 16

    def extract(
        self,
        ego_data: Dict[str, Any],
        focus_account_id: str,
        counterparty_id: str
    ) -> Tuple[Data, int, List[str]]:
        """
        Args:
            ego_data:          dict with 'nodes' and 'links' from MemoryGraphManager
            focus_account_id:  the account being scored
            counterparty_id:   the intended transaction recipient

        Returns:
            pyg_data   : torch_geometric.data.Data with x and edge_index
            focus_idx  : integer index of focus_account_id in node list
            node_ids   : ordered list of node id strings (same order as x rows)
        """
        nodes: List[Dict[str, Any]] = ego_data.get("nodes", [])
        links: List[Dict[str, Any]] = ego_data.get("links", [])

        # Ensure counterparty is present even if not yet in graph
