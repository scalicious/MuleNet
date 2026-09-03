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
