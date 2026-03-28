"""
FORESEEN — Embedding pipeline
Generates vector embeddings for all signals using a free local model.
Enables semantic search and RAG-style retrieval for K2.
"""

from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import numpy as np

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]

# all-MiniLM-L6-v2 — fast, free, 384 dimensions, great for semantic similarity
MODEL_NAME = "all-MiniLM-L6-v2"

def get_signal_text(signal):
    """Combine title and summary into one string for embedding."""
    title = signal.get("title", "") or ""
    summary = signal.get("summary", "") or ""
    agency = signal.get("agency", "") or ""
    jurisdiction = signal.get("jurisdiction", "") or ""
    topics = " ".join(signal.get("topics", []))
    return f"{title}. {summary} {agency} {jurisdiction} {topics}".strip()

def embed_signals(batch_size=256):
    """Generate embeddings for all signals that don't have one yet."""
    print(f"Loading model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    print("Model loaded")

    # only process signals without embeddings
    cursor = signals.find(
        {"$or": [{"embedding": {"$exists": False}}, {"embedding": None}]},
        {"_id": 1, "title": 1, "summary": 1, "agency": 1, "jurisdiction": 1, "topics": 1}
    )

    batch_ids = []
    batch_texts = []
    total_embedded = 0

    for signal in cursor:
        text = get_signal_text(signal)
        batch_ids.append(signal["_id"])
        batch_texts.append(text)

        if len(batch_texts) >= batch_size:
            embeddings = model.encode(batch_texts, show_progress_bar=False)
            for _id, embedding in zip(batch_ids, embeddings):
                signals.update_one(
                    {"_id": _id},
                    {"$set": {"embedding": embedding.tolist()}}
                )
            total_embedded += len(batch_texts)
            print(f"  Embedded {total_embedded} signals so far...")
            batch_ids = []
            batch_texts = []

    # process remaining batch
    if batch_texts:
        embeddings = model.encode(batch_texts, show_progress_bar=False)
        for _id, embedding in zip(batch_ids, embeddings):
            signals.update_one(
                {"_id": _id},
                {"$set": {"embedding": embedding.tolist()}}
            )
        total_embedded += len(batch_texts)

    print(f"\nEmbedding complete: {total_embedded} signals embedded")
    return total_embedded

def semantic_search(query_text, top_k=20, filters=None):
    """
    Find the most semantically similar signals to a query.
    Used by P2 to retrieve top-k signals for a company description.

    Example:
        results = semantic_search(
            "healthcare SaaS using AI for clinical decision support, processes PHI",
            top_k=20,
            filters={"jurisdiction": {"$in": ["federal", "CA", "NY", "TX", "FL"]}}
        )
    """
    print(f"Loading model for search...")
    model = SentenceTransformer(MODEL_NAME)

    query_embedding = model.encode([query_text])[0]
    query_vec = np.array(query_embedding)

    # build mongo query
    mongo_query = {"embedding": {"$exists": True, "$ne": None}}
    if filters:
        mongo_query.update(filters)

    # fetch all candidate signals with embeddings
    candidates = list(signals.find(
        mongo_query,
        {"_id": 0, "title": 1, "summary": 1, "source_url": 1,
         "signal_type": 1, "jurisdiction": 1, "agency": 1,
         "signal_score": 1, "published_date": 1, "topics": 1,
         "embedding": 1}
    ))

    if not candidates:
        return []

    # compute cosine similarity
    scored = []
    for doc in candidates:
        emb = doc.get("embedding")
        if not emb:
            continue
        doc_vec = np.array(emb)
        cosine_sim = float(np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec) + 1e-10))
        doc_copy = {k: v for k, v in doc.items() if k != "embedding"}
        doc_copy["similarity_score"] = round(cosine_sim, 4)
        scored.append(doc_copy)

    # sort by similarity and return top k
    scored.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored[:top_k]

def search_by_company(company_id="demo_company_001", top_k=20):
    """
    Retrieve top-k signals most relevant to a company profile.
    This is what P2 feeds into K2 for prediction generation.
    """
    company = db["companies"].find_one({"company_id": company_id})
    if not company:
        print(f"Company {company_id} not found")
        return []

    # build company description from profile
    name = company.get("name", "")
    industry = company.get("industry", {}).get("primary", "")
    ai_desc = company.get("business_model", {}).get("ai_description", "")
    data_handling = " ".join(company.get("business_model", {}).get("data_handling", []))
    concerns = " ".join(company.get("risk_profile", {}).get("key_concerns", []))
    states = " ".join(company.get("jurisdictions", {}).get("operating_states", []))

    query = f"{name} {industry} {ai_desc} {data_handling} {concerns} {states}"

    # filter to relevant jurisdictions
    operating_states = company.get("jurisdictions", {}).get("operating_states", [])
    jurisdictions = operating_states + ["federal"]

    return semantic_search(
        query_text=query,
        top_k=top_k,
        filters={"jurisdiction": {"$in": jurisdictions}}
    )

if __name__ == "__main__":
    import sys

    if "--search" in sys.argv:
        # test semantic search
        print("\nTesting semantic search for demo company...")
        results = search_by_company(top_k=10)
        print(f"\nTop 10 signals for HealthBridge AI:")
        for r in results:
            print(f"  [{r['similarity_score']}] [{r['jurisdiction']}] {r['title'][:70]}")
    else:
        # run full embedding
        embed_signals(batch_size=256)
        print("\nNow testing semantic search...")
        results = search_by_company(top_k=5)
        print(f"\nTop 5 signals for HealthBridge AI:")
        for r in results:
            print(f"  [{r['similarity_score']}] [{r['jurisdiction']}] {r['title'][:70]}")
