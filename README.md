# MuleNet

MuleNet is an anti-money laundering (AML) detection and forensics platform designed to intercept mule account activity and coordinated laundering rings before transaction commitment.

Traditional AML systems rely on post-transaction batch processing. By the time a suspicious pattern is flagged, the funds have already left the institution. MuleNet shifts the detection window to the pre-commitment phase. It synthesizes behavioral sequences, network topology, and contextual data in real-time, delivering a graduated risk decision and human-readable forensic evidence before the ledger is updated.

## How It Works

When a transaction is initiated, MuleNet places a temporary hold on the action and processes the request through a strictly causal intelligence pipeline. The system guarantees that no future information leaks into the scoring decision by using a temporal filter against the action's exact timestamp.

The request passes through three concurrent lenses:

1. **Sequence Lens:** Analyzes the account's lifecycle velocity and behavioral history. It computes metrics such as credential setup-to-action gaps, login velocity storms, and flow imbalances. This lens is powered by an XGBoost classifier.
2. **Network Lens:** Evaluates the transaction against the known graph topology. It extracts a localized 2-hop causal ego-subgraph and processes it through a 2-Layer Graph Attention Network (GAT). The model exposes attention coefficients to flag structurally anomalous edges, such as circular routing or high-density collection hubs.
3. **Context Lens:** Assesses the payload for heuristic mismatches, evaluating currency anomalies, cross-border inconsistencies, and volume thresholds.

The outputs from these lenses are passed to a **Fusion & Forensic Engine**. This engine aggregates the scores, cross-references deterministic AML typologies, and utilizes SHAP TreeExplainers to generate human-readable reasons for its decision. The final output is a graduated friction tier (Low, Medium, High, Critical) along with a complete dossier for compliance investigators.

## Architecture

```text
                      ┌────────────────────────────────────────┐
                      │        PENDING ACTION REQUEST          │
                      │  (Amount, Payee, Account, Timestamp)   │
                      └───────────────────┬────────────────────┘
                                          │
                  Strict Causal Filter (as_of_timestamp < T)
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
   ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
   │  SEQUENCE LENS  │           │  NETWORK LENS   │           │  CONTEXT LENS   │
   │ XGBoost on Life-│           │ 2-Layer PyG GAT │           │ Heuristic rules │
   │ cycle Event Log │           │ + Attention Wts │           │ & Mismatch flags│
   └────────┬────────┘           └────────┬────────┘           └────────┬────────┘
            │                             │                             │
            └───────────────────────┬─────┴─────────────────────────────┘
                                    ▼
                      ┌───────────────────────────┐
                      │  FUSION & FORENSIC ENGINE │
                      │  * Multimodal Scoring     │
                      │  * Typology & Motif Rules │
                      │  * SHAP Tree Explanations │
                      └─────────────┬─────────────┘
                                    │
                                    ▼
                      ┌───────────────────────────┐
                      │ GRADUATED DECISION MATRIX │
                      │ Low | Medium | High | Crit│
                      └───────────────────────────┘
```

## Key Capabilities

* **Pre-Commitment Enforcement:** Blocks illicit transfers before the database commits the transaction.
* **Explainable AI:** Uses SHAP and GAT attention hooks to translate complex vector calculations into plain-English reasoning for compliance teams.
* **Unsupervised Anomaly Detection:** Incorporates an Isolation Forest engine to detect novel, previously unseen transaction structuring methods.
* **Deterministic Motif Detection:** Identifies concrete structural patterns like multi-bank circular rings and device-sharing syndicates using pure graph heuristics.
* **Temporal Safety:** Operates on an in-memory directed multi-graph that strictly filters connections occurring after the evaluation timestamp.

> [!NOTE]
> The models in this repository are specifically tuned for the IBM HI-Small AML dataset. We handled extreme class imbalance (0.102% laundering rate) by enforcing rigorous tree depth limits and dynamic sample weighting.

## Repository Layout

```text
MuleNet/
├── backend/
│   ├── app/                 # FastAPI application, core memory graph, risk lenses
│   ├── artifacts/           # Serialized GAT, XGBoost, and Isolation Forest models
│   └── tests/               # Causal filter, endpoint, and lens integration tests
├── frontend/
│   ├── src/components/      # React UI: Live Feed, Force-Directed Graph, Dossier
│   └── src/api/             # SSE streaming client and REST integrations
├── data/
│   ├── raw/                 # IBM HI-Small_Trans.csv & HI-Small_accounts.csv
│   └── processed/           # Temporal 80/20 train-test splits and extracted features
└── scripts/                 # Memory-efficient feature engineering and training pipelines
```

## Local Setup

MuleNet requires Python 3.11+ and Node.js 18+.

### Backend Initialization

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API documentation will be available at `http://localhost:8000/docs`.

### Frontend Initialization

```bash
cd frontend
npm install
npm run dev
```

The React dashboard will be running at `http://localhost:5173`.

### Model Training

If you are modifying the dataset or feature engineering pipelines, you can re-train the ML artifacts from scratch. Place your raw IBM CSV files in `data/raw/` and execute the following from the repository root:

```bash
python scripts/generate_train_test_splits.py
python scripts/ibm_feature_engineering.py
python scripts/train_ibm_models.py
```

## Team Workstreams

* **Frontend:** React Dashboard, Force-Directed Graph UI, Dossier Modal, Attack Simulator.
* **ML (GNN):** PyG GAT model, Graph Attention weights, Subgraph extractor, Ring detectors.
* **ML (Sequence):** Tabular feature extraction, Sequence XGBoost, Isolation Forest, SHAP integration.
* **Backend Core:** FastAPI framework, In-memory NetworkX engine, Causal scoring pipeline.
* **Backend Forensics:** Typology detectors, Live Metrics engine, Replay streaming.
