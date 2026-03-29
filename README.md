# Forseen 

**Your guided path through regulatory complexity**

Forseen turns a structured company profile into **actionable compliance intelligence**. Capture how your organization operates, run a **regulatory analysis** grounded in real signals from MongoDB, and explore results on a live dashboard—with **RAG chat** for deeper questions.

---

## Features

- **Guided company setup:** Multi-step profile (identity, scale, data practices, operating states) with validation and persisted session
- **Regulatory analysis pipeline:** Topic-driven `/analyze` flow that fetches signals, runs **K2** predictions, and generates **Hermes** reports
- **Live dashboard:** Company summary, prediction cards, probability views, and drill-down detail
- **Signal-backed reasoning:** MongoDB-fed regulatory content; ingestion pipelines for federal, state, and third-party sources
- **RAG chat:** Ask follow-ups against your context and retrieved documents
- **Local-first demo:** One script spins up backend, model servers, and frontend for hackathon-style iteration

---

## Built With

### AI & orchestration

- **K2 model server** — Prediction and reasoning over regulatory signals
- **Hermes model server** — Structured report and narrative generation
- **Prompt / pipeline design** — End-to-end analyze flow in the FastAPI backend

### Backend & API

- **FastAPI** — Main API (`/analyze`, chat, predictions, reports)
- **Python 3.11+** — Backend and model services
- **Uvicorn** — ASGI for API and model microservices
- **MongoDB** — Signal storage and retrieval (optional Docker helper in local script)
- **Pydantic** — Request/response schemas mirroring the frontend `Company` model

### Frontend & UX

- **React 19** + **TypeScript** — App shell, setup wizard, analysis UI
- **Vite** — Dev server and production build
- **Tailwind CSS v4** — Theming (accent, surfaces, typography)
- **Radix UI** + **Framer Motion** — Accessible primitives and motion
- **Sonner** — Lightweight notifications where used

### Data & engineering

- **data_ingestion/** — Pipelines (embeddings, dedup, entity extraction) and ingestors (news, registers, agencies, Reddit, etc.)
- **Jupyter-friendly workflows** — Notebooks optional for dataset work (see repo layout)

---

## How It Works

1. **Profile:** Complete company setup (legal structure, industry, HQ, operating states, data handling, etc.)
2. **Analyze:** Enter a regulatory **topic**; the backend pulls relevant **signals** from Mongo, calls **K2**, then **Hermes**
3. **Review:** View predictions, timelines, and priority-style actions on the **dashboard**
4. **Dig deeper:** Open drill-downs or use **RAG chat** for exploratory Q&A

---

## Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/YHack-2026.git
cd YHack-2026

# Python: create venv and install backend + model server deps (run-local does this too)
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# Frontend dependencies
cd frontend && npm install && cd ..
```

**Environment:** Copy and fill env templates where present (e.g. `backend/.env.example` → `backend/.env`) with **Mongo URI**, **OpenAI** or other keys, and **model server URLs** as required for your deployment.

---

## Quick Start

From the **repository root**:

```bash
./scripts/run-local.sh
```

This starts **K2** (8001), **Hermes** (8002), the **FastAPI** API (8000), and the **Vite** frontend on **5175**. Logs and PID files live under `.logs/`.

| Service    | URL |
|-----------|-----|
| Frontend  | [http://127.0.0.1:5175](http://127.0.0.1:5175) |
| API docs  | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |

Stop everything:

```bash
./scripts/stop-local.sh
```

**MongoDB:** The script tries `localhost:27017` and can start a **Docker** `mongo:7` container named `forseen-mongo` if Docker is available and nothing is listening.

---

## 💡 Usage examples

**Frontend (development)**

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5175
```

**Health check**

```bash
curl http://127.0.0.1:8000/health
```

**Analyze (see full schema in API docs)**

```bash
curl -s -X POST http://127.0.0.1:8000/analyze/ \
  -H "Content-Type: application/json" \
  -d '{"topic":"State health data privacy","jurisdiction":"CA","company":{ ... }}'
```

---

## 🏆 Why Forseen?

**For builders & hackathon teams**  
Ship a credible compliance narrative quickly: profile → analyze → UI, without stitching five repos.

**For PMs & demos**  
One script, one story: “here is our company, here is what regulation might require next.”

**For engineers extending the stack**  
Clear split: **frontend** (React), **backend** (orchestration), **model_servers** (K2/Hermes), **data_ingestion** (signals).

---

## API documentation

Full reference: **[backend/API.md](backend/API.md)**  

**Analyze (summary)**

```http
POST /analyze/
Content-Type: application/json
```

```json
{
  "topic": "health data privacy",
  "jurisdiction": "CA",
  "company": {
    "name": "Acme Health",
    "legal_structure": "C-Corp",
    "industry": "Healthcare SaaS",
    "size": 45,
    "location": "San Francisco, CA",
    "operating_states": ["CA", "NY"],
    "description": "B2B clinical decision support",
    "handles_pii": true,
    "handles_phi": true,
    "uses_ai_ml": true,
    "b2b": true,
    "certifications": ["HIPAA"]
  }
}
```

Responses include **predictions**, **signals**, and **report** payloads consumed by the dashboard—see `API.md` for the complete contract.

---

## 🙏 Acknowledgments

- Built for **YHack 2026**  
- Thanks to instructors, mentors, and sponsors supporting the hackathon  

---

## Future roadmap

- [ ] Harden auth and multi-tenant company profiles  
- [ ] CI (lint, typecheck, tests) on PRs  
- [ ] Production Docker Compose for Mongo + services  
- [ ] Richer jurisdiction and topic taxonomy in the UI  
- [ ] Mobile-friendly analysis summaries  

---
