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
        links = ego_data.get("links", [])
        reasons: List[Dict[str, Any]] = []

        # Degenerate: completely isolated account with no history
        if len(nodes) <= 1 and not links:
            return 0.08, [{
                "signal": "isolated_node",
                "weight": 0.05,
                "explanation": (
                    "No prior counterparties or transactions found in the "
                    "causal subgraph window — insufficient network evidence."
                )
            }]

        # Convert ego dict to PyG Data object
        try:
            pyg_data, focus_idx, node_ids = subgraph_extractor.extract(
                ego_data, account_id, counterparty_id
            )
        except Exception as e:
            logger.error(f"[NetworkRiskEngine] SubgraphExtractor failed: {e}")
            return 0.15, [{
                "signal": "extractor_error",
                "weight": 0.10,
                "explanation": f"Graph feature extraction error: {str(e)}"
            }]

        x          = pyg_data.x.to(self.device)
        edge_index = pyg_data.edge_index.to(self.device)

        # ---- GAT inference ----
        gat_prob = 0.10
        try:
            with torch.no_grad():
                logits, (att_edge_index, alpha) = self.model(
                    x, edge_index, return_attention_weights=True
                )
                probs = F.softmax(logits, dim=-1)
                if focus_idx < probs.size(0):
                    gat_prob = float(probs[focus_idx, 1].item())

                attention_evidence = self._extract_attention_evidence(
                    alpha, att_edge_index, node_ids, focus_idx
                )
                reasons.extend(attention_evidence)

        except Exception as e:
            logger.error(f"[NetworkRiskEngine] GAT forward error: {e}")

        score = gat_prob

        # ---- Structural heuristic: subgraph density ----
        num_neighbors = len(nodes)
        num_links     = len(links)
        density = num_links / max(1.0, num_neighbors * (num_neighbors - 1))

        if num_neighbors >= 3:
            density_boost = min(0.35, density * 0.7 + num_neighbors * 0.03)
            score = max(score, density_boost + gat_prob * 0.5)
            reasons.append({
                "signal": "high_neighborhood_density",
                "weight": round(density_boost, 3),
                "explanation": (
                    f"Ego-subgraph contains {num_neighbors} counterparties "
                    f"with density {density:.2f} — consistent with hub-and-spoke "
                    "mule topology where funds are aggregated before layering."
                )
            })

        # ---- Structural heuristic: known risky edge adjacency ----
        risky_links = [lnk for lnk in links if lnk.get("is_risky", False)]
        if risky_links:
            risky_boost = min(0.45, 0.20 + len(risky_links) * 0.08)
            score = max(score, 0.72 + len(risky_links) * 0.03)
            reasons.append({
                "signal": "known_mule_cluster_adjacency",
                "weight": round(risky_boost, 3),
                "explanation": (
                    f"{len(risky_links)} high-risk transaction edge(s) detected "
                    "adjacent to this account in an active laundering topology. "
                    "Direct adjacency to flagged nodes is a Tier-1 network indicator."
                )
            })

        # ---- Ring detector: cycle / syndicate / hub / layering ----
        try:
            ring_analysis = ring_detector.analyse(
                account_id=account_id,
                graph=graph_manager.graph,
                as_of_timestamp=as_of_timestamp,
                hops=3
            )

            if ring_analysis["in_ring"]:
                score = max(score, 0.82)
                reasons.append({
                    "signal": "circular_routing_detected",
                    "weight": 0.50,
                    "explanation": (
                        ring_analysis["signals"][0]
                        if ring_analysis["signals"]
                        else (
                            f"Account participates in a {ring_analysis['cycle_length']}-node "
                            "circular routing ring — funds cycle back to origin to obscure trail."
                        )
                    )
                })

            if ring_analysis["device_syndicate"]:
                score = max(score, 0.70)
                peers = ring_analysis["syndicate_accounts"]
                reasons.append({
                    "signal": "device_sharing_syndicate",
                    "weight": 0.40,
                    "explanation": (
                        f"Account shares device fingerprint with {len(peers)} other account(s): "
                        f"{', '.join(peers[:3])}{'...' if len(peers) > 3 else ''}. "
                        "Device sharing across accounts is a strong coordinated fraud indicator."
                    )
                })

            if ring_analysis["is_hub"]:
                score = max(score, 0.60)
                reasons.append({
                    "signal": "collection_hub_pattern",
                    "weight": 0.35,
                    "explanation": (
                        "Account exhibits fan-in collection hub structure — "
                        "multiple senders routing funds through this account "
                        "is consistent with smurfing aggregation before layering."
                    )
                })

            if ring_analysis["layering_depth"] >= 3:
                reasons.append({
                    "signal": "deep_layering_path",
                    "weight": 0.20,
                    "explanation": (
                        f"Funds traceable through a {ring_analysis['layering_depth']}-hop "
                        "layering chain from this account — indicative of structured "
                        "multi-entity obfuscation."
                    )
                })

        except Exception as e:
            logger.error(f"[NetworkRiskEngine] RingDetector error: {e}")

        # ---- Pre-recorded mean GAT attention on incident edges ----
        incident_attn = [
            float(lnk.get("gat_attention", 0.5))
            for lnk in links
            if lnk.get("source") == account_id or lnk.get("target") == account_id
        ]
        if incident_attn:
            mean_attn = float(np.mean(incident_attn))
            if mean_attn >= 0.80:
                score = max(score, 0.65)
                reasons.append({
                    "signal": "high_mean_edge_attention",
                    "weight": round(mean_attn, 3),
                    "explanation": (
                        f"Mean pre-recorded GAT attention on account edges is {mean_attn:.2f} "
                        "(>0.80 threshold). Account sits on a previously identified "
                        "high-attention path in the transaction graph."
                    )
                })

        return min(1.0, round(float(score), 4)), reasons

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _extract_attention_evidence(
        self,
        alpha: torch.Tensor,
        att_edge_index: torch.Tensor,
        node_ids: List[str],
        focus_idx: int
    ) -> List[Dict[str, Any]]:
        """
        Surfaces the top-K highest attention edges from GAT Layer-2 output
        for forensic dossier inclusion.

        Prioritises edges incident to the focus node (sender account),
        falling back to global top-K if no incident edges exist.

        Args:
            alpha          : attention weights tensor (E, 1) or (E,)
            att_edge_index : edge index associated with attention weights (2, E)
            node_ids       : ordered list of node id strings
            focus_idx      : index of focus account in node_ids

        Returns:
            list of evidence dicts: signal, weight, explanation
        """
        evidence = []
        try:
            alpha_np = alpha.squeeze(-1).cpu().numpy()
            if alpha_np.ndim == 0:
                alpha_np = np.array([float(alpha_np)])

            num_edges = att_edge_index.shape[1]
            incident_mask = (
                (att_edge_index[0].cpu().numpy() == focus_idx) |
                (att_edge_index[1].cpu().numpy() == focus_idx)
            )

            if incident_mask.any():
                candidate_scores = alpha_np[incident_mask]
                candidate_edges  = att_edge_index[:, incident_mask].cpu().numpy()
            else:
                candidate_scores = alpha_np
                candidate_edges  = att_edge_index.cpu().numpy()

            top_k       = min(self.TOP_K_ATTENTION_EDGES, len(candidate_scores))
            top_indices = np.argsort(candidate_scores)[-top_k:][::-1]

            for rank, idx in enumerate(top_indices):
                src_i    = int(candidate_edges[0, idx])
                dst_i    = int(candidate_edges[1, idx])
                attn_val = float(candidate_scores[idx])

                src_name = node_ids[src_i] if src_i < len(node_ids) else f"node_{src_i}"
                dst_name = node_ids[dst_i] if dst_i < len(node_ids) else f"node_{dst_i}"

                if src_name == dst_name:
                    continue  # skip self-loops

                evidence.append({
                    "signal": f"gat_attention_edge_rank{rank + 1}",
                    "weight": round(attn_val, 4),
                    "explanation": (
                        f"GAT Layer-2 assigned attention {attn_val:.3f} to edge "
                        f"{src_name} → {dst_name} (rank {rank + 1} of subgraph). "
                        "High attention indicates this edge is structurally significant "
                        "for the mule risk classification."
                    )
                })

        except Exception as e:
            logger.error(f"[NetworkRiskEngine] Attention extraction error: {e}")

        return evidence


network_risk_engine = NetworkRiskEngine()
