# Forseen
## MVP Product Requirements Document

**Single-Company Demo MVP**

*Lean. Focused. Demo-Ready.*

---

### Tech Stack
**Hex • K2 Think V2 • Hermes • MongoDB Atlas**

---

## Document Information

| Field | Value |
|-------|-------|
| Version | 0.1 (MVP) |
| Status | Draft |
| Date | March 2026 |
| Target Timeline | 4-6 weeks |
| Demo Company | TBD (Healthcare SaaS recommended) |

---

## 1. MVP Philosophy

This MVP is designed to demonstrate the complete value proposition to ONE company. We are not building infrastructure for scale — we are building a compelling demo that proves the concept works.

### 1.1 What We Are Building

- End-to-end demo for a single company profile
- Data pipeline in Hex for signal ingestion and orchestration
- Working prediction pipeline (K2 Think) with real regulatory signals
- User-friendly output (Hermes) tailored to that company
- Simple web interface to display predictions and recommendations

### 1.2 What We Are NOT Building

- User authentication or multi-tenancy
- Fully automated real-time ingestion
- Scalable infrastructure beyond demo needs
- Billing, onboarding, or self-service features
- Mobile apps or third-party integrations

### 1.3 Success Criteria

The MVP succeeds if we can:

1. Show the demo company 3-5 relevant regulatory predictions they didn't already know about
2. Demonstrate predictions with clear reasoning and source attribution
3. Deliver actionable recommendations in plain English
4. Complete the demo in under 15 minutes
5. Get the demo company to say: "I would pay for this"

---

## 2. Technology Stack

### 2.1 Stack Overview

The MVP uses a modern, best-in-class stack with clear separation of concerns:

| Component | Technology | Role |
|-----------|------------|------|
| Data Pipeline | Hex | Signal ingestion, transformation, orchestration, analytics |
| Prediction Engine | K2 Think V2 | Deep reasoning for regulatory prediction |
| Communication Layer | Hermes (Nous Research) | Plain-English report generation |
| Data Storage | MongoDB Atlas | Document storage with vector search |
| Presentation | React + Vercel | Demo interface |

### 2.2 Why This Stack

#### Hex for Data Pipelines

- Notebook-style interface for rapid iteration on data logic
- Native Python/SQL support for scraping and transformation
- Built-in scheduling for automated pipeline runs
- API endpoints to trigger pipelines from external systems
- Visualization and dashboards for internal monitoring
- Easy integration with MongoDB and external APIs

#### K2 Think V2 for Prediction

- Deep reasoning capabilities for complex regulatory analysis
- Strong at multi-step logical inference
- Structured output generation (JSON) for downstream processing
- Appropriate for batch prediction workloads

#### Hermes for Communication

- Optimized for natural, conversational output
- Excellent at adapting tone and complexity to audience
- Fast inference for real-time report generation
- Cost-effective for user-facing content

#### MongoDB Atlas for Storage

- Flexible document schema for varied regulatory data
- Vector search for semantic similarity (future use)
- Free tier sufficient for MVP
- Native integration with Hex

---

## 3. Demo Company Selection

### 3.1 Ideal Demo Company Profile

We recommend selecting a healthcare SaaS company because:

- Healthcare is heavily regulated with active regulatory changes
- Multiple overlapping jurisdictions (HIPAA federal + state privacy laws)
- AI/ML regulations increasingly relevant to healthtech
- Clear pain point: compliance is expensive and confusing
- High willingness to pay for compliance solutions

### 3.2 Demo Company Context (Template)

Fill this in with your selected demo company:

| Attribute | Value |
|-----------|-------|
| Company Name | [Demo Company Name] |
| Industry | Healthcare SaaS / Digital Health |
| Employee Count | 25-75 |
| Headquarters | California |
| Operating States | CA, NY, TX, FL (multi-state) |
| Business Model | B2B, sells to healthcare providers |
| Data Handling | PHI (patient data), PII |
| Uses AI/ML | Yes — clinical decision support |
| Current Compliance | HIPAA compliant, SOC 2 in progress |
| Key Concerns | State privacy laws, AI regulations, HIPAA updates |

### 3.3 Regulatory Topics to Cover

Based on this profile, the MVP should generate predictions for:

- State comprehensive privacy laws (CA, TX, etc.)
- AI/ML regulation in healthcare (FDA, state laws)
- HIPAA modifications and enforcement trends
- State health data privacy laws (WA My Health My Data Act model)
- FTC enforcement on health apps and AI claims

---

## 4. Hex Pipeline Architecture

### 4.1 Pipeline Overview

Hex serves as the central orchestration layer, managing data flow from sources through prediction to output:

```
Sources → Hex Ingestion → MongoDB (signals) → Hex Transformation → K2 Think API → MongoDB (predictions) → Hermes API → MongoDB (reports) → Demo UI
```

### 4.2 Hex Notebooks (Projects)

The MVP requires 4 Hex notebooks:

| Notebook | Purpose | Schedule |
|----------|---------|----------|
| 1. Signal Ingestion | Scrape/fetch regulatory signals from sources | Daily or manual trigger |
| 2. Signal Processing | Clean, dedupe, tag, compute signal scores | After ingestion |
| 3. Prediction Generation | Call K2 Think API, store predictions | Daily or manual trigger |
| 4. Report Generation | Call Hermes API, generate user reports | On-demand |

### 4.3 Notebook 1: Signal Ingestion

This notebook fetches regulatory signals from configured sources and stores raw data in MongoDB.

#### Data Sources (MVP Scope)

| Source | Method | Data Type |
|--------|--------|-----------|
| Federal Register API | REST API | Federal rules, proposed rules, notices |
| Congress.gov API | REST API | Bills, hearings, votes |
| State Legislature RSS | RSS/scrape | State bills (CA, WA, NY priority) |
| FTC Press Releases | RSS/scrape | Enforcement actions |
| Manual Entry | CSV upload | Curated signals from research |

#### Ingestion Logic (Python in Hex)

```python
# Pseudo-code for Federal Register ingestion
import requests
from pymongo import MongoClient

def fetch_federal_register(topics, days_back=30):
    base_url = "https://www.federalregister.gov/api/v1/documents"
    params = {
        "conditions[topics][]": topics,
        "conditions[publication_date][gte]": date_cutoff,
        "per_page": 100
    }
    response = requests.get(base_url, params=params)
    return response.json()["results"]

def store_signals(signals, collection):
    for signal in signals:
        doc = {
            "signal_type": "federal_register",
            "title": signal["title"],
            "summary": signal["abstract"],
            "source_url": signal["html_url"],
            "jurisdiction": "federal",
            "agency": signal["agencies"][0]["name"],
            "published_date": signal["publication_date"],
            "topics": extract_topics(signal),
            "created_at": datetime.utcnow()
        }
        collection.update_one(
            {"source_url": doc["source_url"]},
            {"$set": doc},
            upsert=True
        )
```

### 4.4 Notebook 2: Signal Processing

This notebook transforms raw signals into analysis-ready data with topic tags and signal scores.

#### Processing Steps

1. **Deduplication:** Remove duplicate signals across sources
2. **Topic Tagging:** Classify signals into regulatory topics (privacy, AI, HIPAA, etc.)
3. **Relevance Filtering:** Filter to signals relevant to demo company profile
4. **Signal Scoring:** Compute importance score based on source authority, recency, and topic match
5. **Enrichment:** Add jurisdiction mapping, affected industries

#### Topic Classification (Python)

```python
# Simple keyword-based classification (can upgrade to ML later)
TOPIC_KEYWORDS = {
    "privacy": ["privacy", "personal data", "consumer data", "CCPA", "CPRA"],
    "health_data": ["health data", "PHI", "HIPAA", "patient", "medical records"],
    "ai_ml": ["artificial intelligence", "machine learning", "algorithm", "automated decision"],
    "ftc_enforcement": ["FTC", "Federal Trade Commission", "consent decree", "settlement"]
}

def classify_topics(text):
    text_lower = text.lower()
    matched_topics = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            matched_topics.append(topic)
    return matched_topics
```

#### Signal Scoring

| Factor | Weight | Logic |
|--------|--------|-------|
| Source Authority | 0.3 | Federal Register > State > News |
| Recency | 0.25 | Decay function, newer = higher |
| Topic Match | 0.25 | Relevance to demo company profile |
| Signal Type | 0.2 | Enforcement > Rule > Proposed > News |

### 4.5 Notebook 3: Prediction Generation

This notebook calls K2 Think V2 API to generate regulatory predictions from processed signals.

#### K2 Think Integration

```python
import requests

def generate_prediction(topic, jurisdiction, signals, company_context):
    prompt = f"""
    You are a regulatory prediction system. Analyze these signals and predict 
    the likelihood of formal regulation on {topic} in {jurisdiction}.
    
    COMPANY CONTEXT:
    {company_context}
    
    SIGNALS:
    {format_signals(signals)}
    
    Provide analysis as JSON:
    {{
        "topic": "{topic}",
        "jurisdiction": "{jurisdiction}",
        "probability_6mo": float (0-1),
        "probability_12mo": float (0-1),
        "probability_24mo": float (0-1),
        "confidence": "low" | "medium" | "high",
        "likely_requirements": [list of probable provisions],
        "reasoning": "detailed chain of thought explaining the prediction",
        "key_signals": [
            {{"signal_id": "...", "weight": float, "rationale": "..."}}
        ],
        "counterfactors": [factors that could prevent/delay regulation],
        "recommended_preparation": [specific actions to prepare]
    }}
    """
    
    response = requests.post(
        "https://api.k2.ai/v1/completions",  # placeholder URL
        headers={"Authorization": f"Bearer {K2_API_KEY}"},
        json={
            "model": "k2-think-v2",
            "prompt": prompt,
            "temperature": 0.2,
            "max_tokens": 4000
        }
    )
    return parse_json_response(response.json())
```

#### Prediction Topics for MVP

| Topic | Jurisdiction | Signal Count Target |
|-------|--------------|---------------------|
| State Health Data Privacy | Multi-state | 5-8 signals |
| AI in Healthcare Regulation | Federal + CA | 4-6 signals |
| Comprehensive Privacy Laws | TX, FL, other emerging | 5-7 signals |
| HIPAA Enforcement Trends | Federal | 3-5 signals |
| FTC Health App Enforcement | Federal | 4-6 signals |

### 4.6 Notebook 4: Report Generation

This notebook calls Hermes API to transform K2 predictions into user-friendly reports.

#### Hermes Integration

```python
def generate_report(predictions, company_profile):
    prompt = f"""
    You are a regulatory advisor writing for a small business owner. 
    Your reader is busy, not a lawyer, and needs clear action items.
    
    COMPANY PROFILE:
    - Name: {company_profile['name']}
    - Industry: {company_profile['industry']}
    - Locations: {company_profile['locations']}
    - Key concerns: {company_profile['concerns']}
    
    PREDICTIONS TO COMMUNICATE:
    {format_predictions(predictions)}
    
    Write a briefing that:
    1. Leads with what matters most to THIS business
    2. Explains each regulatory development in plain English
    3. Gives specific, actionable recommendations
    4. Prioritizes actions by urgency and impact
    5. Uses no jargon — write like explaining to a smart friend
    
    Format as JSON:
    {{
        "headline": "attention-grabbing summary",
        "executive_summary": "2-3 sentences max",
        "sections": [
            {{
                "title": "section title",
                "whats_happening": "plain English explanation",
                "why_it_matters": "specific to this company",
                "what_to_do": "concrete action items"
            }}
        ],
        "priority_actions": [
            {{"priority": "high|medium|low", "action": "...", "deadline": "...", "effort": "..."}}
        ]
    }}
    """
    
    response = requests.post(
        "https://api.nous.ai/v1/completions",  # placeholder URL
        headers={"Authorization": f"Bearer {HERMES_API_KEY}"},
        json={
            "model": "hermes-3",
            "prompt": prompt,
            "temperature": 0.7,
            "max_tokens": 3000
        }
    )
    return parse_json_response(response.json())
```

### 4.7 Hex Scheduling and Orchestration

Hex provides built-in scheduling to automate the pipeline:

| Notebook | Schedule | Trigger |
|----------|----------|---------|
| Signal Ingestion | Daily 6:00 AM UTC | Scheduled + manual |
| Signal Processing | After ingestion completes | Notebook dependency |
| Prediction Generation | Daily 8:00 AM UTC | Scheduled + manual |
| Report Generation | On-demand | Manual or API trigger |

#### Hex API Endpoints

Hex notebooks can be triggered via API for integration with the demo UI:

```bash
# Trigger report generation from demo UI
curl -X POST "https://app.hex.tech/api/v1/projects/{project_id}/runs" \
  -H "Authorization: Bearer {HEX_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"inputParams": {"company_id": "demo_company_001"}}'
```

### 4.8 Hex Dashboard (Internal)

Create a Hex dashboard for internal monitoring:

- Signal count by source and topic over time
- Prediction count and confidence distribution
- Pipeline run status and errors
- Data freshness indicators

---

## 5. MongoDB Schema

### 5.1 Collections

#### signals collection

Raw and processed regulatory signals:

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Auto-generated |
| signal_type | string | federal_register \| congress \| state \| ftc \| manual |
| title | string | Signal headline |
| summary | string | 2-3 sentence summary |
| source_url | string | Link to original source |
| jurisdiction | string | federal \| CA \| NY \| etc. |
| agency | string | Issuing agency if applicable |
| topics | array | Classified topics |
| signal_score | number | Computed importance (0-1) |
| published_date | date | Original publication date |
| created_at | date | When ingested |
| processed_at | date | When processed/scored |

#### predictions collection

K2-generated predictions:

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Auto-generated |
| topic | string | Regulatory topic |
| jurisdiction | string | Where this applies |
| probability_6mo | number | 6-month likelihood (0-1) |
| probability_12mo | number | 12-month likelihood (0-1) |
| probability_24mo | number | 24-month likelihood (0-1) |
| confidence | string | high \| medium \| low |
| likely_requirements | array | Predicted provisions |
| reasoning | string | K2 chain of thought |
| key_signals | array | Supporting signal references |
| counterfactors | array | Risk factors |
| recommended_preparation | array | Suggested actions |
| generated_at | date | When prediction was made |
| model_version | string | K2 model version used |

#### reports collection

Hermes-generated user reports:

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Auto-generated |
| company_id | string | Demo company identifier |
| report_type | string | briefing \| alert \| deep_dive |
| headline | string | Report headline |
| executive_summary | string | 2-3 sentence summary |
| sections | array | Report content sections |
| priority_actions | array | Ranked action items |
| predictions_used | array | Prediction IDs referenced |
| generated_at | date | When report was generated |

#### companies collection

Demo company profile (single record for MVP):

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | Auto-generated |
| company_id | string | Unique identifier |
| name | string | Company name |
| industry | object | Industry classification |
| jurisdictions | object | Operating locations |
| business_model | object | B2B/B2C, data handling, AI usage |
| compliance_status | object | Current certifications |
| risk_profile | object | Key concern areas |
| created_at | date | Profile creation date |

---

## 6. Demo Interface

### 6.1 UI Requirements

The demo UI is intentionally simple — a single-page application that displays:

1. **Company context banner** showing demo company profile
2. **Prediction cards** with probability scores and confidence indicators
3. **Expandable reasoning sections** showing K2 analysis
4. **Action plan section** with prioritized Hermes recommendations
5. **Source attribution** linking to original regulatory signals

### 6.2 Tech Stack

- React with TypeScript
- Tailwind CSS + shadcn/ui for styling
- MongoDB Atlas Data API for data fetching (no backend needed)
- Vercel for deployment

### 6.3 Key UI Components

#### Prediction Card

- Topic and jurisdiction header
- Probability gauge (visual indicator)
- Confidence badge (High/Medium/Low with color coding)
- Likely requirements as bullet list
- Expandable reasoning section
- Source signals with links

#### Action Panel

- Priority-sorted action items
- Effort and timeline estimates
- Checkbox for tracking (optional, not persisted for MVP)

### 6.4 Demo Flow

The demo should follow this narrative arc:

1. **Context (2 min):** "Let me show you what we built for [Company Name]..."
2. **Signals (2 min):** "We're tracking these regulatory developments that affect you..."
3. **Predictions (5 min):** "Based on our analysis, here's what we predict..." (walk through 3-4 predictions)
4. **Recommendations (3 min):** "Here's exactly what you should do about it..."
5. **Value (2 min):** "Imagine knowing this 12 months before your competitors..."

---

## 7. Development Timeline

### 7.1 Week-by-Week Plan

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | Setup + Data Research | MongoDB Atlas setup, Hex workspace, demo company selection, signal source research |
| Week 2 | Hex Pipelines (Ingestion) | Notebooks 1-2: Signal ingestion and processing pipelines |
| Week 3 | K2 Integration | Notebook 3: K2 Think API integration, prompt engineering, test predictions |
| Week 4 | Hermes Integration | Notebook 4: Hermes API integration, report generation, output formatting |
| Week 5 | Demo UI | React app development, MongoDB Data API integration, Vercel deployment |
| Week 6 | Polish + Test | End-to-end testing, demo script, dry runs, refinements |

### 7.2 Resource Requirements

| Role | Time | Responsibility |
|------|------|----------------|
| Developer | 4-6 weeks FT | Hex pipelines, API integrations, demo UI |
| Product/Domain Expert | 15-20 hours | Signal curation, demo company selection, prompt tuning, demo script |
| Designer (optional) | 5-10 hours | UI polish if needed |

### 7.3 Cost Estimate

| Item | Cost/Month | Notes |
|------|------------|-------|
| Hex | $0-50 | Free tier or Team tier for scheduling |
| MongoDB Atlas | $0 | Free tier (M0) sufficient |
| K2 Think API | $50-100 | One-time for prediction generation |
| Hermes API | $20-50 | One-time for report generation |
| Vercel | $0 | Free tier for hosting |
| Domain (optional) | $15 | One-time for custom domain |
| **Total (MVP)** | **$85-215** | One-time cost to build demo |

---

## 8. Sample Outputs

### 8.1 Sample Prediction (K2 Output)

Example of what a K2-generated prediction should look like:

| Field | Example Value |
|-------|---------------|
| Topic | State Health Data Privacy Laws |
| Jurisdiction | Multi-state (WA model spreading) |
| Probability (12 mo) | 72% |
| Confidence | High |
| Likely Requirements | Consumer consent for health data, deletion rights, prohibition on sale, private right of action |
| Key Signals | WA My Health My Data Act (passed), CT SB 3 (introduced), NV AB 381 (committee), FTC enforcement surge |
| Reasoning | Washington's My Health My Data Act (2023) created a replicable template. 4 states have introduced similar bills in 2024-25. FTC enforcement on health apps signals federal interest. Pattern mirrors CCPA diffusion. |

### 8.2 Sample Report Section (Hermes Output)

Example of how Hermes communicates to the user:

---

**🔴 HIGH PRIORITY: Health Data Privacy Laws Spreading Fast**

**What's Happening**

> "Several states are copying Washington's health data privacy law. We estimate a 72% chance you'll need to comply with at least one new state law in the next 12 months. These laws cover health data that HIPAA doesn't — including data from your app when it's not connected to a healthcare provider."

**Why This Matters to You**

> "Your clinical decision support tool processes patient symptoms and health history. Under these new laws, that data gets special protection even when HIPAA doesn't apply. Since you operate in CA, NY, TX, and FL, you could face requirements in multiple states with slightly different rules."

**What to Do Now**

> "1. Audit your data flows to identify health data not covered by HIPAA (2-3 days effort). 2. Update your privacy policy to disclose health data practices (1 day). 3. Build consent mechanisms that can adapt to different state requirements (1-2 weeks). Starting now gives you 6+ months lead time."

---

## 9. Success Metrics

### 9.1 MVP Success Criteria

The MVP is successful if we achieve ALL of the following:

- Demo company confirms predictions were valuable and non-obvious
- Demo company expresses willingness to pay ($100-500/month range)
- Demo company offers to introduce us to 2+ similar companies
- Complete demo delivered in under 15 minutes
- All pipelines run without manual intervention during demo
- K2 predictions include clear, verifiable reasoning
- Hermes output is genuinely readable by non-lawyers

### 9.2 Technical Validation

| Metric | Target | Measurement |
|--------|--------|-------------|
| Signal ingestion | 20+ relevant signals | Count in MongoDB |
| Prediction coverage | 5-8 predictions | Count in MongoDB |
| Prediction quality | Verifiable reasoning | Manual review |
| Report readability | No jargon | Manual review |
| Pipeline reliability | 0 failures during demo | Hex run logs |
| UI load time | <3 seconds | Browser dev tools |

---

## 10. Post-MVP Roadmap

### 10.1 Immediate Next Steps (If Demo Succeeds)

- Onboard 5-10 pilot customers using Hex-powered semi-automated process
- Validate willingness to pay with early pricing tests
- Expand signal sources to cover additional verticals
- Gather feedback on prediction accuracy and usefulness

### 10.2 Product Expansion (Months 2-4)

- Full automation of Hex pipelines with error handling
- User authentication and multi-tenancy
- Self-service business profile onboarding
- Email alerts via Hex scheduled jobs
- Hex-powered analytics dashboard for customers

### 10.3 Scale (Months 5-8)

- Expand to 50 states for regulatory coverage
- Multiple industry vertical support
- Prediction accuracy tracking and model fine-tuning
- Billing integration (Stripe)
- Migrate intensive pipelines to dedicated infrastructure if needed

---

## 11. Appendix

### 11.1 API Reference

#### K2 Think V2

- **Endpoint:** https://api.k2.ai/v1/completions (placeholder)
- **Model:** k2-think-v2
- **Temperature:** 0.2 (for analytical consistency)
- **Max tokens:** 4000

#### Hermes (Nous Research)

- **Endpoint:** https://api.nous.ai/v1/completions (placeholder)
- **Model:** hermes-3
- **Temperature:** 0.7 (for natural language)
- **Max tokens:** 3000

#### Hex API

- **Endpoint:** https://app.hex.tech/api/v1/
- **Authentication:** Bearer token
- **Key endpoints:** /projects/{id}/runs (trigger notebook)

#### MongoDB Atlas Data API

- **Endpoint:** https://data.mongodb-api.com/app/{app-id}/endpoint/data/v1
- **Authentication:** API key
- **Actions:** find, findOne, insertOne, updateOne

### 11.2 Signal Sources

| Source | URL | API/Method |
|--------|-----|------------|
| Federal Register | federalregister.gov/api | REST API (free) |
| Congress.gov | api.congress.gov | REST API (free, key required) |
| CA Legislature | leginfo.legislature.ca.gov | RSS + scrape |
| WA Legislature | leg.wa.gov | RSS + scrape |
| FTC | ftc.gov/news-events | RSS |
| HHS/OCR | hhs.gov/hipaa | RSS + scrape |

### 11.3 Glossary

| Term | Definition |
|------|------------|
| **Hex** | Data notebook and pipeline platform for analytics and orchestration |
| **K2 Think** | Deep reasoning AI model for complex analytical tasks |
| **Hermes** | Nous Research conversational AI model optimized for natural language |
| **Signal** | Any data point indicating potential regulatory change |
| **Signal Score** | Computed importance metric (0-1) based on source, recency, relevance |

---

*— End of MVP Document —*