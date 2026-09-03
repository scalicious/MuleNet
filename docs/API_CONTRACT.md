# Pre-Commitment Risk Intelligence — API Contract

This document defines the REST and Streaming API contract between the **Pre-Commitment Risk Intelligence** frontend application and backend services.

---

## 1. Global Standards & Conventions

### Base URL
```
http://localhost:8000/api/v1
```

### Standard Headers
- **Request Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json` (or `text/event-stream` for live streams)
- **Response Headers**:
  - `Content-Type: application/json; charset=utf-8`

### Standard Error Response Format
All endpoint errors return a consistent error payload with appropriate HTTP status codes (e.g., `400`, `404`, `422`, `500`):

```json
{
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "Transaction was not found"
  }
}
```

Common Error Codes:
| Error Code | HTTP Status | Description |
|---|---|---|
| `TRANSACTION_NOT_FOUND` | 404 Not Found | The specified transaction ID does not exist. |
| `ACCOUNT_NOT_FOUND` | 404 Not Found | The specified account ID does not exist. |
| `INVALID_SCENARIO` | 400 Bad Request | The simulation scenario is invalid or unsupported. |
| `VALIDATION_ERROR` | 422 Unprocessable Entity | Request body contains malformed fields or invalid types. |
| `INTERNAL_SERVER_ERROR` | 500 Internal Server Error | Unhandled server error during risk evaluation. |

---

## 2. API Endpoints

---

### `GET /transactions/:id`

Retrieves real-time pre-commitment risk evaluation and status details for a single transaction.

- **HTTP Method**: `GET`
- **URL**: `/api/v1/transactions/:id`
- **Path Parameters**:
  - `id` (string, required): Unique transaction identifier (e.g., `TXN-10482`).
- **Request Body**: None

#### Success Response (`200 OK`)
```json
{
  "id": "TXN-10482",
  "timestamp": "2026-09-03T12:42:18Z",
  "sender": "ACC-1042",
  "receiver": "ACC-8821",
  "amount": 84920,
  "currency": "USD",
  "riskScore": 94,
  "riskTier": "CRITICAL",
  "status": "BLOCKED"
}
```

#### Important Fields
| Field | Type | Description |
|---|---|---|
| `id` | string | Unique transaction identifier. |
| `timestamp` | string (ISO-8601) | Timestamp when the pre-commitment evaluation was executed. |
| `sender` | string | Originating account ID. |
| `receiver` | string | Destination / counterparty account ID. |
| `amount` | number | Transaction amount in currency units. |
| `currency` | string | ISO-4217 currency code (e.g., `USD`). |
| `riskScore` | integer (0-100) | Composite risk score calculated across all scoring engines. |
| `riskTier` | string | Risk classification tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). |
| `status` | string | Enforcement decision status (`ALLOWED`, `FLAGGED`, `CHALLENGED`, `BLOCKED`). |

#### Possible Statuses
- `200 OK`: Transaction found and returned.
- `404 Not Found`: Transaction does not exist.
- `500 Internal Server Error`: Backend error.

#### Error Response (`404 Not Found`)
```json
{
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "Transaction was not found"
  }
}
```

---

### `GET /transactions/:id/dossier`

Retrieves a detailed forensic case dossier for a transaction, containing multi-lens explainability factors, SHAP importance weights, detected typology evidence, and network graph relationships.

- **HTTP Method**: `GET`
- **URL**: `/api/v1/transactions/:id/dossier`
- **Path Parameters**:
  - `id` (string, required): Unique transaction identifier (e.g., `TXN-10482`).
- **Request Body**: None

#### Success Response (`200 OK`)
```json
{
  "transactionId": "TXN-10482",
  "evaluatedAt": "2026-09-03T12:42:18Z",
  "summary": {
    "sender": "ACC-1042",
    "receiver": "ACC-8821",
    "amount": 84920,
    "currency": "USD",
    "riskScore": 94,
    "riskTier": "CRITICAL",
    "recommendedAction": "BLOCK_AND_HOLD"
  },
  "lenses": {
    "sequenceScore": 96,
    "networkScore": 91,
    "contextScore": 88,
    "anomalyScore": 95
  },
  "typologies": [
    {
      "code": "RAPID_PASS_THROUGH",
      "name": "Rapid Pass-Through Dispersion",
      "severity": "CRITICAL",
      "evidence": "92% of funds forwarded to 3 downstream hops within 4.2 minutes of receipt."
    },
    {
      "code": "CROSS_INSTITUTION_RING",
      "name": "Cross-Bank Mule Syndicate",
      "severity": "HIGH",
      "evidence": "Account is node #3 in a 5-node cyclic transfer chain spanning multiple routing numbers."
    }
  ],
  "shapFactors": [
    {
      "feature": "time_since_credential_change_sec",
      "impact": 0.38,
      "description": "Password and 2FA device updated 90 seconds prior to high-value transfer."
    },
    {
      "feature": "velocity_zscore_1h",
      "impact": 0.31,
      "description": "Hourly outflow is 8.4x standard deviations above sender's 90-day baseline."
    },
    {
      "feature": "graph_cycle_depth",
      "impact": 0.22,
      "description": "Target receiver is strongly connected to known mule cluster #MR-401."
    }
  ],
  "graphContext": {
    "clusterId": "MULE-CLUSTER-882",
    "directDegree": 6,
    "syndicateRisk": 0.94
  }
}
```

#### Important Fields
| Field | Type | Description |
|---|---|---|
| `transactionId` | string | Identifier of the evaluated transaction. |
| `summary` | object | Core summary metrics and recommended mitigation action. |
| `lenses` | object | Breakdown of component scores (Sequence, Network, Context, Anomaly). |
| `typologies` | array | Specific fraud/AML patterns identified with forensic evidence strings. |
| `shapFactors` | array | Explainable AI feature impact scores and human-readable descriptions. |
| `graphContext` | object | Network graph metrics and cluster identifiers. |

#### Possible Statuses
- `200 OK`: Dossier retrieved successfully.
- `404 Not Found`: Transaction ID not found.
- `500 Internal Server Error`: Backend error building dossier.

#### Error Response (`404 Not Found`)
```json
{
  "error": {
    "code": "DOSSIER_NOT_FOUND",
    "message": "Dossier for transaction TXN-10482 could not be found"
  }
}
```

---

### `GET /accounts/:id`

Retrieves risk intelligence, profiling statistics, and mule association metadata for a specific account.

- **HTTP Method**: `GET`
- **URL**: `/api/v1/accounts/:id`
- **Path Parameters**:
  - `id` (string, required): Unique account identifier (e.g., `ACC-1042`).
- **Request Body**: None

#### Success Response (`200 OK`)
```json
{
  "accountId": "ACC-1042",
  "status": "RESTRICTED",
  "riskScore": 89,
  "riskTier": "HIGH",
  "firstSeen": "2025-11-14T08:12:00Z",
  "totalTransactedVolume": 1428500.00,
  "currency": "USD",
  "muleClusterId": "CLUSTER-904",
  "flags": {
    "isMuleCandidate": true,
    "hasCredentialTamper": true,
    "dormantReactivated": false
  },
  "activitySummary": {
    "totalInflow30d": 740200.00,
    "totalOutflow30d": 725000.00,
    "averageHoldTimeMinutes": 6.4,
    "flaggedTxnCount": 14
  }
}
```

#### Important Fields
| Field | Type | Description |
|---|---|---|
| `accountId` | string | Account identifier. |
| `status` | string | Account status (`ACTIVE`, `RESTRICTED`, `SUSPENDED`, `UNDER_REVIEW`). |
| `riskScore` | integer (0-100) | Overall account baseline risk score. |
| `riskTier` | string | Risk classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`). |
| `muleClusterId` | string \| null | ID of linked mule syndicate cluster if detected. |
| `flags` | object | High-level risk flags (mule candidate, credential tampering, dormancy). |
| `activitySummary` | object | 30-day velocity, flow balance, and hold time statistics. |

#### Possible Statuses
- `200 OK`: Account profile retrieved successfully.
- `404 Not Found`: Account ID does not exist.
- `500 Internal Server Error`: Backend service error.

#### Error Response (`404 Not Found`)
```json
{
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account was not found"
  }
}
```

---

### `GET /demo/stream`

Server-Sent Events (SSE) streaming real-time pre-commitment transaction evaluations and risk alerts directly to the frontend.

- **HTTP Method**: `GET`
- **URL**: `/api/v1/demo/stream`
- **Headers**:
  - `Accept: text/event-stream`
- **Request Body**: None

#### Response Stream Format
The server keeps the HTTP connection open with `Content-Type: text/event-stream`, emitting events at a steady interval:

```
event: transaction
data: {"id":"TXN-10482","timestamp":"2026-09-03T12:42:18Z","sender":"ACC-1042","receiver":"ACC-8821","amount":84920,"currency":"USD","riskScore":94,"riskTier":"CRITICAL","status":"BLOCKED"}

event: transaction
data: {"id":"TXN-10483","timestamp":"2026-09-03T12:42:21Z","sender":"ACC-2931","receiver":"ACC-7734","amount":18200,"currency":"USD","riskScore":78,"riskTier":"HIGH","status":"CHALLENGED"}

event: transaction
data: {"id":"TXN-10484","timestamp":"2026-09-03T12:42:24Z","sender":"ACC-1022","receiver":"ACC-2931","amount":820,"currency":"USD","riskScore":12,"riskTier":"LOW","status":"ALLOWED"}
```

#### Expected Transaction Event JSON Schema
```json
{
  "id": "TXN-10482",
  "timestamp": "2026-09-03T12:42:18Z",
  "sender": "ACC-1042",
  "receiver": "ACC-8821",
  "amount": 84920,
  "currency": "USD",
  "riskScore": 94,
  "riskTier": "CRITICAL",
  "status": "BLOCKED"
}
```

#### Important Fields
| Field | Type | Description |
|---|---|---|
| `id` | string | Unique transaction event ID. |
| `timestamp` | string (ISO-8601) | Timestamp of event generation. |
| `sender` | string | Sender account identifier. |
| `receiver` | string | Destination account identifier. |
| `amount` | number | Amount in standard numeric format. |
| `currency` | string | Currency string (`USD`, `EUR`, etc.). |
| `riskScore` | integer (0-100) | Real-time computed risk score. |
| `riskTier` | string | Risk category: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. |
| `status` | string | Real-time decision: `ALLOWED`, `FLAGGED`, `CHALLENGED`, `BLOCKED`. |

#### Possible Statuses
- `200 OK`: Stream established (`Content-Type: text/event-stream; charset=utf-8`).
- `500 Internal Server Error`: Stream generator initialization failed.

---

### `POST /demo/simulate`

Triggers synthetic attack simulations (e.g., mule ring formation, smurfing, account takeover pass-through) to validate detection algorithms in real time.

- **HTTP Method**: `POST`
- **URL**: `/api/v1/demo/simulate`
- **Headers**:
  - `Content-Type: application/json`

#### Request Body
```json
{
  "scenario": "MULE_RING"
}
```

#### Supported Scenarios
- `MULE_RING`: Circular cross-bank syndicate flow.
- `ACCOUNT_TAKEOVER`: Credential modification followed by rapid pass-through.
- `SMURFING`: High-frequency micro-structuring transfers into a central aggregator.

#### Success Response (`200 OK`)
```json
{
  "simulationId": "SIM-92831",
  "scenario": "MULE_RING",
  "status": "DETECTED",
  "affectedAccounts": [
    "ACC-1042",
    "ACC-8821",
    "ACC-7734"
  ],
  "transactionsGenerated": 38,
  "riskIncrease": 42,
  "detection": {
    "riskScore": 96,
    "riskTier": "CRITICAL"
  }
}
```

#### Important Fields
| Field | Type | Description |
|---|---|---|
| `simulationId` | string | Unique tracking ID for the injected simulation run. |
| `scenario` | string | Injected attack typology (`MULE_RING`, `ACCOUNT_TAKEOVER`, `SMURFING`). |
| `status` | string | Outcome status (`INITIALIZED`, `IN_PROGRESS`, `DETECTED`, `MITIGATED`). |
| `affectedAccounts` | array of strings | List of account IDs involved in the synthetic attack. |
| `transactionsGenerated` | integer | Total count of synthetic transactions dispatched into the pipeline. |
| `riskIncrease` | integer | Percentage increase in aggregate network risk index. |
| `detection` | object | Culminating risk score and tier evaluated by the risk engines. |

#### Possible Statuses
- `200 OK`: Simulation successfully executed and evaluated.
- `400 Bad Request`: Unknown or invalid scenario payload.
- `422 Unprocessable Entity`: Missing required `scenario` field.
- `500 Internal Server Error`: Backend simulation execution failure.

#### Error Response (`400 Bad Request`)
```json
{
  "error": {
    "code": "INVALID_SCENARIO",
    "message": "Scenario 'UNKNOWN_ATTACK' is not supported. Valid options: MULE_RING, ACCOUNT_TAKEOVER, SMURFING"
  }
}
```
