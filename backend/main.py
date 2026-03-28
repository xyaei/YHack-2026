from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import predictions, reports, analyze

app = FastAPI(title="Forseen API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predictions.router)
app.include_router(reports.router)
app.include_router(analyze.router)


@app.get("/health")
def health():
    return {"status": "ok"}
