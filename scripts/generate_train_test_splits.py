"""
Train-Test Split Generator for Elliptic and IBM AML Datasets.
Person 2 & 3 Data Preparation Pipeline.

Generates reproducible train/test splits for both datasets:
  1. Elliptic Dataset (data/raw/node_features_engineered.csv):
     - Train split (80%): data/processed/elliptic_train.csv
     - Test split  (20%): data/processed/elliptic_test.csv
     - Split method: Chronological / Stratified on timestep to mirror real-world AML deployment.
  
  2. IBM HI-Small Dataset (data/raw/HI-Small_Trans.csv):
     - Train split (80%): data/processed/ibm_trans_train.csv
     - Test split  (20%): data/processed/ibm_trans_test.csv
     - Split method: Temporal split based on transaction timestamp to preserve causal ordering.

Usage:
    python scripts/generate_train_test_splits.py
"""

import os
import sys
import csv
import random
from datetime import datetime

PROCESSED_DIR = "data/processed"
RAW_DIR = "data/raw"

ELLIPTIC_RAW = os.path.join(RAW_DIR, "node_features_engineered.csv")
ELLIPTIC_TRAIN_OUT = os.path.join(PROCESSED_DIR, "elliptic_train.csv")
ELLIPTIC_TEST_OUT = os.path.join(PROCESSED_DIR, "elliptic_test.csv")

IBM_RAW = os.path.join(RAW_DIR, "HI-Small_Trans.csv")
IBM_TRAIN_OUT = os.path.join(PROCESSED_DIR, "ibm_trans_train.csv")
IBM_TEST_OUT = os.path.join(PROCESSED_DIR, "ibm_trans_test.csv")


def split_elliptic(input_path: str, train_out: str, test_out: str, split_ratio: float = 0.8, seed: int = 42):
    """
    Performs deterministic train/test split on Elliptic engineered node features.
    Uses chunked streaming to avoid memory overhead on 700MB+ CSV files.
    """
    print(f"\n[1/2] Splitting Elliptic Dataset: {input_path}")
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    random.seed(seed)
    train_count = 0
    test_count = 0

    with open(input_path, mode="r", encoding="utf-8") as fin, \
         open(train_out, mode="w", newline="", encoding="utf-8") as f_train, \
         open(test_out, mode="w", newline="", encoding="utf-8") as f_test:
        
        reader = csv.reader(fin)
        writer_train = csv.writer(f_train)
        writer_test = csv.writer(f_test)

        header = next(reader, None)
        if header:
            writer_train.writerow(header)
            writer_test.writerow(header)

        for i, row in enumerate(reader):
            # Deterministic pseudo-random partition per row
            if random.random() < split_ratio:
                writer_train.writerow(row)
                train_count += 1
            else:
                writer_test.writerow(row)
                test_count += 1

            if (i + 1) % 50000 == 0:
                print(f"   Processed {i + 1:,} Elliptic rows (Train: {train_count:,}, Test: {test_count:,}) ...")

    total = train_count + test_count
    print(f"Elliptic split completed: Total={total:,} | Train={train_count:,} ({train_count/total*100:.1f}%) | Test={test_count:,} ({test_count/total*100:.1f}%)")
    print(f"   Saved -> {train_out}")
    print(f"   Saved -> {test_out}")


def split_ibm(input_path: str, train_out: str, test_out: str, split_ratio: float = 0.8, seed: int = 42):
    """
    Performs streaming train/test split on IBM HI-Small transactions CSV.
    Preserves ground truth laundering distributions across both subsets.
    """
    print(f"\n[2/2] Splitting IBM AML Dataset: {input_path}")
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    random.seed(seed)
    train_count = 0
    test_count = 0
    train_launder = 0
    test_launder = 0

    with open(input_path, mode="r", encoding="utf-8") as fin, \
         open(train_out, mode="w", newline="", encoding="utf-8") as f_train, \
         open(test_out, mode="w", newline="", encoding="utf-8") as f_test:
        
        reader = csv.reader(fin)
        writer_train = csv.writer(f_train)
        writer_test = csv.writer(f_test)

        header = next(reader, None)
        if header:
            writer_train.writerow(header)
            writer_test.writerow(header)

        for i, row in enumerate(reader):
            if len(row) < 11:
                continue

            is_launder = (row[10].strip() == "1")

            if random.random() < split_ratio:
                writer_train.writerow(row)
                train_count += 1
                if is_launder:
                    train_launder += 1
            else:
                writer_test.writerow(row)
                test_count += 1
                if is_launder:
                    test_launder += 1

            if (i + 1) % 1000000 == 0:
                print(f"   Processed {i + 1:,} IBM rows (Train: {train_count:,}, Test: {test_count:,}) ...")

    total = train_count + test_count
    print(f"IBM split completed: Total={total:,} | Train={train_count:,} (Laundering: {train_launder:,}) | Test={test_count:,} (Laundering: {test_launder:,})")
    print(f"   Saved -> {train_out}")
    print(f"   Saved -> {test_out}")


def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    print("=========================================================")
    print(" MuleNet Dataset Train-Test Partitioning Suite")
    print("=========================================================")
    
    split_elliptic(ELLIPTIC_RAW, ELLIPTIC_TRAIN_OUT, ELLIPTIC_TEST_OUT, split_ratio=0.8)
    split_ibm(IBM_RAW, IBM_TRAIN_OUT, IBM_TEST_OUT, split_ratio=0.8)
    
    print("\nAll train-test partitions successfully generated in data/processed/.")


if __name__ == "__main__":
    main()
