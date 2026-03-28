# Forseen API

Base URL: `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs`

---

## Running the server

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in MONGO_URI and model server URLs
uvicorn main:app --reload --port 8000
```

---

## Endpoints

### `GET /health`

```bash
curl http://localhost:8000/health
```

**Response**
```json
{ "status": "ok" }
```

---

### `POST /analyze/`

The main endpoint. Fetches matching signals from MongoDB, runs K2 prediction, then generates a Hermes report. Returns both.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `company` | object | Yes | Company profile (see below) |
| `topic` | string | Yes | Regulatory topic to analyze |
| `jurisdiction` | string | Yes | State code or `"federal"` |
| `topic_tags` | string[] | No | MongoDB topic tags to filter signals. Derived from `topic` if omitted |
| `signal_limit` | int | No | Max signals to fetch (default: 20) |

**Example**

```bash
curl -X POST http://localhost:8000/analyze/ \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "health data privacy",
    "jurisdiction": "CA",
    "topic_tags": ["health_data", "privacy"],
    "company": {
      "name": "Acme Health",
      "legal_structure": "C-Corp",
      "industry": "Healthcare SaaS",
      "size": 45,
      "revenue_range": "$1M-$10M",
      "location": "San Francisco, CA",
      "operating_states": ["CA", "NY", "TX", "FL"],
      "description": "B2B clinical decision support platform for healthcare providers",
      "handles_pii": true,
      "handles_phi": true,
      "uses_ai_ml": true,
      "b2b": true,
      "certifications": ["HIPAA"],
      "funding_stage": "Series A"
    }
  }'
```

**Response**

```json
{
  "signals_used": 12,
  "prediction": {
    "topic": "health data privacy",
    "jurisdiction": "CA",
    "probability_6mo": 0.45,
    "probability_12mo": 0.72,
    "probability_24mo": 0.88,
    "confidence": "high",
    "likely_requirements": ["..."],
    "reasoning": "...",
    "key_signals": [
      { "signal_id": "...", "weight": 0.35, "rationale": "..." }
    ],
    "counterfactors": ["..."],
    "recommended_preparation": ["..."]
  },
  "report": {
    "headline": "...",
    "executive_summary": "...",
    "sections": [
      {
        "title": "...",
        "whats_happening": "...",
        "why_it_matters": "...",
        "what_to_do": "..."
      }
    ],
    "priority_actions": [
      { "priority": "high", "action": "...", "deadline": "...", "effort": "..." }
    ],
    "predictions_used": ["health data privacy"]
  }
}
```

**Errors**

| Status | Reason |
|---|---|
| `404` | No signals found in MongoDB for the given topic/jurisdiction |
| `502` | Model server (K2 or Hermes) returned an error |

---

### `POST /predictions/`

Calls K2 directly. Signals must be passed in the request body — this endpoint does not fetch from MongoDB.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `topic` | string | Yes | Regulatory topic |
| `jurisdiction` | string | Yes | State code or `"federal"` |
| `company` | object | Yes | Company profile (see below) |
| `signals` | dict[] | No | Raw signal data to pass to K2 (default: `[]`) |

**Example**

```bash
curl -X POST http://localhost:8000/predictions/ \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI in healthcare",
    "jurisdiction": "federal",
    "company": {
      "name": "Acme Health",
      "legal_structure": "C-Corp",
      "industry": "Healthcare SaaS",
      "size": 45,
      "location": "San Francisco, CA",
      "description": "B2B clinical decision support platform",
      "uses_ai_ml": true,
      "handles_phi": true
    },
    "signals": []
  }'
```

**Response** — same `prediction` object as `/analyze/`.

---

### `POST /reports/`

Calls Hermes directly. Use when you already have prediction IDs and just need a report.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `company` | object | Yes | Company profile (see below) |
| `prediction_ids` | string[] | No | Prediction identifiers to include in the report |

**Example**

```bash
curl -X POST http://localhost:8000/reports/ \
  -H "Content-Type: application/json" \
  -d '{
    "prediction_ids": ["health data privacy", "AI in healthcare"],
    "company": {
      "name": "Acme Health",
      "legal_structure": "C-Corp",
      "industry": "Healthcare SaaS",
      "size": 45,
      "location": "San Francisco, CA",
      "description": "B2B clinical decision support platform"
    }
  }'
```

**Response** — same `report` object as `/analyze/`.

---

## Company Profile object

Shared across all endpoints.

### Required fields

| Field | Type | Description |
|---|---|---|
| `name` | string | Company name |
| `legal_structure` | string | `LLC` \| `C-Corp` \| `S-Corp` \| `Sole Proprietorship` \| `Partnership` \| `Nonprofit` |
| `industry` | string | e.g. `"Healthcare SaaS"`, `"Fintech"`, `"EdTech"` |
| `size` | int | Number of employees |
| `location` | string | Headquarters city/state, e.g. `"San Francisco, CA"` |
| `description` | string | Short plain-English description of the business |

### Optional fields

| Field | Type | Default | Description |
|---|---|---|---|
| `revenue_range` | string | `null` | `"<$1M"` \| `"$1M-$10M"` \| `"$10M-$50M"` \| `"$50M+"` |
| `operating_states` | string[] | `[]` | States where the company does business, e.g. `["CA", "NY", "TX"]` |
| `operating_countries` | string[] | `["US"]` | Countries of operation |
| `handles_pii` | bool | `false` | Collects or processes personal data |
| `handles_phi` | bool | `false` | Handles HIPAA-covered health data |
| `handles_financial_data` | bool | `false` | Processes payment or financial data |
| `uses_ai_ml` | bool | `false` | Uses AI/ML in products or operations |
| `b2b` | bool | `true` | `true` = sells to businesses, `false` = sells to consumers |
| `customer_count` | int | `null` | Approximate number of customers |
| `certifications` | string[] | `[]` | e.g. `["HIPAA", "SOC2", "ISO27001", "PCI-DSS"]` |
| `has_legal_counsel` | bool | `false` | Has in-house or retained legal counsel |
| `has_compliance_team` | bool | `false` | Has a dedicated compliance function |
| `funding_stage` | string | `null` | `Bootstrapped` \| `Pre-seed` \| `Seed` \| `Series A` \| `Series B` \| `Series C` \| `Public` |
| `is_public` | bool | `false` | Publicly traded company |
