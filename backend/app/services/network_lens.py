import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv
from typing import Tuple, Dict, Any, List
import numpy as np

class MuleGATModel(nn.Module):
    """
    2-Layer Graph Attention Network (GAT) with attention coefficient hooks
    for explainable AML network forensics.
    """
    def __init__(self, in_channels: int = 16, hidden_channels: int = 64, out_channels: int = 2, heads: int = 2):
        super().__init__()
        self.conv1 = GATConv(in_channels, hidden_channels, heads=heads, concat=True)
        self.conv2 = GATConv(hidden_channels * heads, out_channels, heads=1, concat=False)

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor, return_attention_weights: bool = False):
        if return_attention_weights:
            x, (edge_index_1, alpha_1) = self.conv1(x, edge_index, return_attention_weights=True)
            x = F.relu(x)
            x = F.dropout(x, p=0.2, training=self.training)
            out, (edge_index_2, alpha_2) = self.conv2(x, edge_index, return_attention_weights=True)
            return out, (edge_index_2, alpha_2)
        else:
            x = self.conv1(x, edge_index)
            x = F.relu(x)
            x = F.dropout(x, p=0.2, training=self.training)
            out = self.conv2(x, edge_index)
            return out

class NetworkRiskEngine:
    def __init__(self):
        self.device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
        # ---------------------------------------------------------
        # PERSON 2 PLACEHOLDER: GAT Model
        # Load gat.pt here in reality, but using dummy init for now.
        # TO BE CHANGED ACCORDINGLY AS PER THE REQUIREMENT
        # ---------------------------------------------------------
        self.model = MuleGATModel(in_channels=16, hidden_channels=64, out_channels=2).to(self.device)
        self.model.eval()

    def score_network(
        self,
        account_id: str,
        counterparty_id: str,
        as_of_timestamp: str,
        graph_manager: Any
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Computes network risk score and extracts top GAT edge attention weights.
        """
        # ---------------------------------------------------------
        # PERSON 2 PLACEHOLDER: Network Forensics & GAT inference
        # Extract features from subgraph, run GAT, extract attention hook
        # (return_attention_weights=True)
        # TO BE CHANGED ACCORDINGLY AS PER THE REQUIREMENT
        # ---------------------------------------------------------
        
        ego_data = graph_manager.get_ego_subgraph(account_id, as_of_timestamp, hops=2)
        num_neighbors = len(ego_data["nodes"])
        num_links = len(ego_data["links"])

        # Base network score calculated from graph connectivity (dummy for Person 4)
        density = num_links / max(1, (num_neighbors * (num_neighbors - 1)))
        base_score = min(1.0, (num_neighbors * 0.05) + (density * 0.4))

        reasons = []
        if num_neighbors >= 3:
            reasons.append({
                "signal": "high_neighborhood_density",
                "weight": 0.35,
                "explanation": f"Connected to {num_neighbors} active transaction counterparties in a short window."
            })

        return round(base_score, 4), reasons

network_risk_engine = NetworkRiskEngine()
