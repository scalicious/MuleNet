"""
IBM AML Feature Engineering Pipeline — Person 3 (ML - Sequence & SHAP)
Dataset: IBM HI-Small (HI-Small_Trans.csv + HI-Small_accounts.csv)

Key findings from dataset analysis that drive feature design:
  - 5,078,345 total transactions, only 5,177 laundering (0.102% — extreme imbalance)
  - ACH payment format accounts for 86.6% of all laundering transactions
  - Laundering senders average 22.4 unique receivers vs 2.1 for clean senders
  - Format entropy significantly higher in laundering nodes (1.171 vs 0.542)
  - Burst score (max txns per 60-min window) 3.33 vs 1.83 for clean
  - Amount coefficient of variation higher in laundering (1.933 vs 1.316)
  - All laundering has exact 1:1 paid/received ratio (no shrinkage/growth)
  - Structuring (9000-9999 amounts) 2.78x more common in laundering
  - Zero cross-currency laundering in this dataset

Run from repo root:
    python scripts/ibm_feature_engineering.py

Outputs:
    data/processed/ibm_node_features.csv   — per-account feature table for XGBoost + GAT
    data/processed/ibm_edge_list.csv        — canonical edge list for PyG graph construction
"""

import os
import sys
import math
import csv
import collections
import statistics
from datetime import datetime
import numpy as np

RAW_DIR       = "data/raw"
PROCESSED_DIR = "data/processed"
TRANS_CSV     = os.path.join(RAW_DIR, "HI-Small_Trans.csv")
ACCOUNTS_CSV  = os.path.join(RAW_DIR, "HI-Small_accounts.csv")
NODE_OUT      = os.path.join(PROCESSED_DIR, "ibm_node_features.csv")
EDGE_OUT      = os.path.join(PROCESSED_DIR, "ibm_edge_list.csv")

# Payment format integer encoding (order preserves risk signal)
FMT_MAP = {
    "ACH": 0, "Wire": 1, "Cheque": 2, "Cash": 3,
    "Credit Card": 4, "Bitcoin": 5, "Reinvestment": 6
}
# Known high-risk currencies from analysis
HIGH_RISK_CURRENCIES = {
    "Saudi Riyal", "Bitcoin", "Ruble", "Yuan", "Shekel"
}


def load_accounts_metadata(path: str):
    """
    Parses HI-Small_accounts.csv without heavy memory overhead.
    Returns:
        dict: node_id -> entity_type string (e.g. 'Corporation', 'Sole Proprietorship')
    """
    entity_map = {}
    if not os.path.exists(path):
        print(f"Warning: {path} not found. Defaulting entity types to 'Unknown'.")
        return entity_map

    print(f"[1/5] Loading account entity mappings from {path} ...")
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        # Columns: Bank Name, Bank ID, Account Number, Entity ID, Entity Name
        for row in reader:
            if len(row) >= 5:
                bank_id = row[1].strip()
                acc_num = row[2].strip()
                entity_name = row[4].strip()
                node_id = f"{bank_id}_{acc_num}"
                entity_map[node_id] = entity_name
    print(f"      Mapped {len(entity_map):,} account entities.")
    return entity_map
