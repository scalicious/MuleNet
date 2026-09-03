import os
import json
import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATConv
from torch_geometric.data import Data
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import shap

def train_and_export_all_models():
    artifacts_dirs = [
        os.path.abspath("backend/artifacts"),
        os.path.abspath("MuleNet/backend/artifacts")
    ]
    for ad in artifacts_dirs:
        os.makedirs(ad, exist_ok=True)

    print("=== 1. Loading Feature-Engineered Dataset Sample ===")
    csv_path = "data/raw/node_features_engineered.csv"
    if not os.path.exists(csv_path):
        csv_path = "MuleNet/data/raw/node_features_engineered.csv"

    # Load 25,000 samples for fast training & serialization
    df_sample = pd.read_csv(csv_path, nrows=25000)
    print(f"Loaded dataset sample shape: {df_sample.shape}", flush=True)

    # Feature columns for XGBoost Sequence Model
    # Synthetic target generation if classes not provided in raw:
    # High risk if flow_imbalance > 0.8, degree_vs_time_mean > 3.0, or extreme feature counts
    risk_indicator = (
        (df_sample["flow_imbalance"] > 0.75).astype(int) * 2 +
        (df_sample["degree_vs_time_mean"] > 2.5).astype(int) * 2 +
        (df_sample["extreme_feature_count_3"] > 3).astype(int) * 2 +
        (df_sample["total_degree"] > 15).astype(int)
    )
    labels = (risk_indicator >= 3).astype(int)

    # 1. XGBoost Sequence Risk Model
    seq_features = [
        "flow_imbalance", "fan_in_out_ratio", "degree_vs_time_mean",
        "in_degree_ratio", "out_degree_ratio", "log_total_degree",
        "extreme_feature_count_2", "extreme_feature_count_3",
        "feature_mean", "feature_std"
    ]
    
    X = df_sample[seq_features].fillna(0.0)
    y = labels

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("=== 2. Training XGBoost Risk Model ===")
    scale_pos_weight = max(1.0, (len(y_train) - sum(y_train)) / max(1, sum(y_train)))
    xgb_model = xgb.XGBClassifier(
        n_estimators=50,
        max_depth=4,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric="logloss",
        n_jobs=1
    )
    xgb_model.fit(X_train, y_train)

    train_acc = xgb_model.score(X_train, y_train)
    test_acc = xgb_model.score(X_test, y_test)
    print(f"XGBoost Train Acc: {train_acc:.4f}, Test Acc: {test_acc:.4f}")

    # Fit SHAP explainer
    print("Saving XGBoost model...")


    for ad in artifacts_dirs:
        xgb_model_path = os.path.join(ad, "xgboost_sequence_model.json")
        xgb_model.save_model(xgb_model_path)
        
        meta = {
            "features": seq_features,
            "train_acc": float(train_acc),
            "test_acc": float(test_acc),
            "scale_pos_weight": float(scale_pos_weight)
        }
        with open(os.path.join(ad, "sequence_model_meta.json"), "w") as f:
            json.dump(meta, f, indent=2)

    # 2. PyG GAT Network Risk Model
    print("=== 3. Training Graph Attention Network (GAT) ===")
    class MuleGATModel(nn.Module):
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

    # Construct synthetic graph batches for GNN pre-training
    num_nodes = 500
    gat_features = 16
    x_nodes = torch.randn(num_nodes, gat_features)
    
    # Generate edges (scale-free mule clusters)
    src_list, dst_list = [], []
    for i in range(num_nodes):
        # preferential attachment
        k = np.random.randint(1, 5)
        targets = np.random.choice(num_nodes, size=k, replace=False)
        for t in targets:
            if t != i:
                src_list.append(i)
                dst_list.append(t)
    
    edge_index = torch.tensor([src_list, dst_list], dtype=torch.long)
