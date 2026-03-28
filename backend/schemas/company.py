from pydantic import BaseModel
from typing import List, Optional


class CompanyProfile(BaseModel):
    name: str
    legal_structure: str                  # LLC | C-Corp | S-Corp | Sole Proprietorship | Partnership | Nonprofit
    industry: str                         # e.g. "Healthcare SaaS", "Fintech", "EdTech"
    size: int                             # number of employees
    revenue_range: Optional[str] = None  # e.g. "<$1M", "$1M-$10M", "$10M-$50M", "$50M+"
    location: str                         # headquarters city/state
    operating_states: List[str] = []     # states where they do business, e.g. ["CA", "NY", "TX"]
    operating_countries: List[str] = ["US"]
    description: str                      # short plain-English description of what the company does

    # Data & technology
    handles_pii: bool = False
    handles_phi: bool = False             # HIPAA-covered health data
    handles_financial_data: bool = False
    uses_ai_ml: bool = False
    b2b: bool = True                      # True = sells to businesses, False = sells to consumers (B2C)
    customer_count: Optional[int] = None

    # Current compliance posture
    certifications: List[str] = []       # e.g. ["HIPAA", "SOC2", "ISO27001", "PCI-DSS"]
    has_legal_counsel: bool = False
    has_compliance_team: bool = False

    # Fundraising / ownership
    funding_stage: Optional[str] = None  # Bootstrapped | Pre-seed | Seed | Series A/B/C | Public
    is_public: bool = False
