from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

db = MongoClient(os.getenv("MONGODB_URI"))["foreseen"]
signals = db["signals"]
signal_scores = db["signal_scores"]

def compute_velocity():
    now = datetime.now(timezone.utc)
    window_7d  = now - timedelta(days=7)
    window_30d = now - timedelta(days=30)

    # get all unique topics across all signals
    all_topics = signals.distinct("topics")
    print(f"Computing velocity for {len(all_topics)} topics")

    results = []

    for topic in all_topics:
        count_7d  = signals.count_documents({"topics": topic, "published_date": {"$gte": window_7d}})
        count_30d = signals.count_documents({"topics": topic, "published_date": {"$gte": window_30d}})

        # velocity = how much faster signals are coming in last 7d vs 30d baseline
        # baseline: count_30d / 4 would be expected 7d count if uniform
        baseline = count_30d / 4 if count_30d > 0 else 0
        velocity = round(count_7d / baseline, 2) if baseline > 0 else 0.0

        # avg signal score for this topic
        pipeline = [
            {"$match": {"topics": topic}},
            {"$group": {"_id": None, "avg_score": {"$avg": "$signal_score"}}}
        ]
        agg = list(signals.aggregate(pipeline))
        avg_score = round(agg[0]["avg_score"], 3) if agg else 0.0

        score_doc = {
            "topic": topic,
            "count_7d": count_7d,
            "count_30d": count_30d,
            "velocity_7d": velocity,
            "avg_signal_score": avg_score,
            "computed_at": now,
        }

        signal_scores.update_one(
            {"topic": topic},
            {"$set": score_doc},
            upsert=True
        )
        results.append(score_doc)

    # print ranked by velocity
    results.sort(key=lambda x: x["velocity_7d"], reverse=True)
    print(f"\nTop topics by velocity (7d vs 30d baseline):")
    print(f"{'Topic':<25} {'7d':>6} {'30d':>6} {'Velocity':>10} {'Avg Score':>10}")
    print("-" * 62)
    for r in results:
        print(f"{r['topic']:<25} {r['count_7d']:>6} {r['count_30d']:>6} {r['velocity_7d']:>10.2f} {r['avg_signal_score']:>10.3f}")

    print(f"\nVelocity scores written to signal_scores collection")

if __name__ == "__main__":
    compute_velocity()
