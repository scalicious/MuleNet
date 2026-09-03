"""
IBM AML Offline Model Training Suite — Person 2 (GNN) & Person 3 (XGBoost + SHAP)
Dataset: IBM HI-Small AML Data

Trains and exports all production ML artifacts:
  1. XGBoost Sequence Risk Classifier (backend/artifacts/xgboost_sequence_model.json)
     - Trained on engineered behavioural features with scale_pos_weight for 0.1% base rate.
     - Early stopping, depth 5, robust regularization (subsample=0.8, colsample=0.8) to prevent overfitting.
  2. SHAP TreeExplainer Metadata Validation
     - Generates backend/artifacts/sequence_model_meta.json with feature alignments.
  3. Isolation Forest Anomaly Engine (backend/artifacts/isolation_forest.joblib + scaler)
     - Unsupervised novelty detector on flow imbalance, degree velocity, and structuring.
  4. PyTorch Geometric 2-Layer GAT (backend/artifacts/mule_gat_model.pt)
     - Multi-head attention with attention coefficient extraction for topological forensics.

Usage:
    python scripts/train_ibm_models.py
"""

import os
import sys
import math
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
from sklearn.metrics import classification_report, roc_auc_score, average_precision_score
import xgboost as xgb
import shap

PROCESSED_CSV = "data/processed/ibm_node_features.csv"
ARTIFACTS_DIR = "backend/artifacts"


def resolve_dataset_sample(csv_path: str, max_samples: int = 100000):
    """
    Loads engineered dataset with class balancing. Retains ALL positive instances
    and samples high-quality negatives to prevent memory overflow and combat 0.102% imbalance.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Processed features not found at {csv_path}. Run scripts/ibm_feature_engineering.py first."
        )

    print(f"[Data Loader] Loading engineered features from {csv_path} ...")
    df = pd.read_csv(csv_path)
    positives = df[df["is_laundering"] == 1]
    negatives = df[df["is_laundering"] == 0]
    
    print(f"  Raw Dataset: {len(positives):,} positive instances, {len(negatives):,} negative instances.")
    
    # Cap negatives to maintain realistic yet trainable imbalance ratio (e.g. 1:20 or max_samples)
    neg_sample_count = min(len(negatives), max_samples - len(positives))
    neg_sampled = negatives.sample(n=neg_sample_count, random_state=42)
    
    combined = pd.concat([positives, neg_sampled], ignore_index=True)
    combined = combined.sample(frac=1.0, random_state=42).reset_index(drop=True)
    print(f"  Training cohort sampled: {len(combined):,} records ({len(positives):,} positive, {neg_sample_count:,} negative).")
    return combined


def train_xgboost_sequence_lens(df: pd.DataFrame):
