"""
Network Risk Engine — Person 2 (ML - GNN)

2-Layer Graph Attention Network (GAT) with:
- Full PyG integration via SubgraphExtractor
- Exposed attention coefficients per edge (alpha)
- Top-K edge attribution logging for forensic dossiers
- Ring-topology structural heuristics via RingDetector
- Graceful fallback when model weights unavailable

Architecture:
    Layer 1: GATConv(16 -> 32, heads=4, concat=True) -> BN -> ELU -> Dropout(0.15)
    Layer 2: GATConv(128 -> 2, heads=1, concat=False)

Scoring pipeline:
    1. MemoryGraphManager.get_ego_subgraph() -> ego dict
    2. SubgraphExtractor.extract()           -> PyG Data + focus_idx
    3. MuleGATModel forward (attention=True) -> softmax probs + alpha
    4. Top-K attention edges extracted       -> forensic evidence list
    5. RingDetector structural heuristics    -> score boosted where warranted
    6. Final score clipped to [0, 1]
"""

import os
import logging
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv
from typing import Tuple, Dict, Any, List, Optional
import numpy as np

from app.services.subgraph_extractor import subgraph_extractor
from app.services.ring_detector import ring_detector

logger = logging.getLogger(__name__)


class MuleGATModel(nn.Module):
    """
    2-Layer Graph Attention Network with multi-head attention and
    extractable per-edge attention coefficients for forensic attribution.

    Architecture:
        Layer 1: GATConv(16 -> 32, heads=4, concat=True) -> BN1d -> ELU -> Dropout(0.15)
        Layer 2: GATConv(128 -> 2,  heads=1, concat=False)

    The model operates in inference mode with return_attention_weights=True
    to surface edge-level attention for compliance evidence.
    """

    def __init__(
        self,
        in_channels: int = 16,
        hidden_channels: int = 32,
        out_channels: int = 2,
        heads: int = 4,
        dropout: float = 0.15
    ):
        super().__init__()
        self.dropout = dropout

        self.conv1 = GATConv(
            in_channels,
            hidden_channels,
            heads=heads,
            concat=True,
            dropout=dropout,
            add_self_loops=False
        )
        self.bn1 = nn.BatchNorm1d(hidden_channels * heads)

        self.conv2 = GATConv(
            hidden_channels * heads,
            out_channels,
            heads=1,
            concat=False,
            dropout=dropout,
            add_self_loops=False
        )

    def forward(
        self,
        x: torch.Tensor,
        edge_index: torch.Tensor,
        return_attention_weights: bool = False
    ):
        """
        Args:
            x                      : Node feature matrix (N, 16)
            edge_index             : COO edge index (2, E)
            return_attention_weights: If True, returns (logits, (edge_index, alpha))

        Returns:
            logits  : (N, 2) raw class scores
            optionally: (edge_index_l2, alpha_l2) attention from Layer 2
        """
        if return_attention_weights:
            x_out, (ei1, alpha1) = self.conv1(x, edge_index, return_attention_weights=True)
            x_out = self.bn1(x_out) if x_out.size(0) > 1 else x_out
            x_out = F.elu(x_out)
            x_out = F.dropout(x_out, p=self.dropout, training=self.training)
            logits, (ei2, alpha2) = self.conv2(x_out, edge_index, return_attention_weights=True)
            return logits, (ei2, alpha2)
        else:
            x_out = self.conv1(x, edge_index)
            x_out = self.bn1(x_out) if x_out.size(0) > 1 else x_out
            x_out = F.elu(x_out)
            x_out = F.dropout(x_out, p=self.dropout, training=self.training)
            return self.conv2(x_out, edge_index)


class NetworkRiskEngine:
    """
    Drives the MuleGATModel for real-time per-transaction network risk scoring.

    The engine computes a composite network risk score from:
      - GAT softmax probability (class=1 = mule/risky node)
      - Subgraph density heuristics
      - Known-risky edge adjacency
      - RingDetector cycle, syndicate, hub, and layering signals
      - Pre-recorded mean edge attention from graph metadata

    All structural scores are bounded to [0, 1] and merged via max-fusion
    with the GAT base probability to ensure the ML signal is never
    overridden but can always be boosted by structural evidence.
    """

    TOP_K_ATTENTION_EDGES = 3

    def __init__(self):
        self.device = torch.device("cpu")
        self.model = MuleGATModel(
            in_channels=16,
            hidden_channels=32,
            out_channels=2,
            heads=4,
            dropout=0.15
        ).to(self.device)
        self._load_model()
        self.model.eval()

    def _load_model(self) -> None:
        """
        Attempts to load serialized GAT weights from known artifact paths.
        Supports both raw state_dict and wrapped checkpoint dicts.
        Falls back to random initialisation (dev mode) if no weights found.
        """
        model_paths = [
            os.path.abspath("backend/artifacts/mule_gat_model.pt"),
            os.path.abspath("MuleNet/backend/artifacts/mule_gat_model.pt"),
            os.path.abspath("artifacts/mule_gat_model.pt"),
        ]
        loaded = False
        for p in model_paths:
            if os.path.exists(p):
                try:
                    state = torch.load(p, map_location=self.device, weights_only=True)
                    if "model_state_dict" in state:
                        state = state["model_state_dict"]
                    self.model.load_state_dict(state, strict=False)
                    logger.info(f"[NetworkRiskEngine] GAT weights loaded from {p}")
                    loaded = True
                    break
                except Exception as e:
                    logger.warning(f"[NetworkRiskEngine] Could not load weights from {p}: {e}")

        if not loaded:
            logger.warning(
                "[NetworkRiskEngine] No pretrained GAT weights found — "
                "using random initialisation (dev mode). Structural heuristics still active."
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def score_network(
        self,
        account_id: str,
        counterparty_id: str,
        as_of_timestamp: str,
        graph_manager: Any
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Scores the network risk for a pending transaction.

        Args:
            account_id        : Sender account identifier
            counterparty_id   : Intended recipient account identifier
            as_of_timestamp   : ISO-8601 timestamp — causal cutoff for graph
            graph_manager     : MemoryGraphManager instance

        Returns:
            (network_risk_score ∈ [0,1], list of forensic evidence dicts)
        """
        ego_data = graph_manager.get_ego_subgraph(
            account_id, as_of_timestamp, hops=2
        )
        nodes = ego_data.get("nodes", [])
