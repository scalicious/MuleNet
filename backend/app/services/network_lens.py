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
