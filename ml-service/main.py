import json
import os
import secrets
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field
from PIL import Image

from text_preprocessing import normalize_text

IMAGE_SIZE = (224, 224)
MODEL_PATH = Path(os.getenv("MODEL_PATH", "artifacts/municipal-image-model.keras"))
CLASSES_PATH = MODEL_PATH.with_suffix(".classes.json")
WORK_TYPE_MODEL_PATH = Path(os.getenv("WORK_TYPE_MODEL_PATH", "artifacts/work_type_model.joblib"))
ML_SERVICE_TOKEN = os.getenv("ML_SERVICE_TOKEN", "")

CATEGORY_ALIASES = {
    "pothole": "Road Damage",
    "road": "Road Damage",
    "garbage": "Garbage",
    "waste": "Garbage",
    "drain": "Drainage",
    "drainage": "Drainage",
    "sewage": "Sewage",
    "sewer": "Sewage",
    "streetlight": "Streetlight",
    "street_light": "Streetlight",
    "water": "Water Supply",
    "sanitation": "Sanitation",
    "flood": "Flooding",
    "infrastructure": "Infrastructure",
    "safety": "Public Safety",
}

app = FastAPI(title="CivicGuard municipal image model")
model = None
class_names: list[str] = []
work_type_artifact: dict | None = None


class TextClassificationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


def require_service_token(x_ml_service_token: str | None = Header(default=None)) -> None:
    """Protect model inference when the service is reachable beyond localhost."""
    if ML_SERVICE_TOKEN and not secrets.compare_digest(x_ml_service_token or "", ML_SERVICE_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid model-service credential")


@app.on_event("startup")
def load_model() -> None:
    global model, class_names, work_type_artifact
    if MODEL_PATH.exists() and CLASSES_PATH.exists():
        from tensorflow import keras

        model = keras.models.load_model(MODEL_PATH)
        class_names = json.loads(CLASSES_PATH.read_text(encoding="utf-8"))
    if WORK_TYPE_MODEL_PATH.exists():
        candidate = joblib.load(WORK_TYPE_MODEL_PATH)
        if not {"model", "model_name", "model_version", "threshold"}.issubset(candidate):
            raise RuntimeError("Work-type model artifact is missing required metadata")
        work_type_artifact = candidate


def category_for_label(label: str) -> str:
    normalized = label.lower().strip().replace("-", "_").replace(" ", "_")
    return CATEGORY_ALIASES.get(normalized, "Other")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok" if model is not None or work_type_artifact is not None else "model_not_loaded",
        "image_model": "loaded" if model is not None else "not_loaded",
        "work_type_model": "loaded" if work_type_artifact is not None else "not_loaded",
    }


@app.post("/classify-work-type")
def classify_work_type(payload: TextClassificationRequest, x_ml_service_token: str | None = Header(default=None)) -> dict[str, object]:
    require_service_token(x_ml_service_token)
    if work_type_artifact is None:
        raise HTTPException(status_code=503, detail="Train and configure the work-type model first")
    text = normalize_text(payload.text)
    if len(text) < 5:
        raise HTTPException(status_code=400, detail="Complaint text is too short to classify")
    model_pipeline = work_type_artifact["model"]
    probabilities = model_pipeline.predict_proba([text])[0]
    index = int(np.argmax(probabilities))
    confidence = float(probabilities[index])
    predicted = str(model_pipeline.classes_[index])
    threshold = float(work_type_artifact["threshold"])
    return {
        "predictedWorkType": predicted,
        "confidence": confidence,
        "model": work_type_artifact["model_name"],
        "modelVersion": work_type_artifact["model_version"],
        "threshold": threshold,
        "accepted": confidence >= threshold,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...), x_ml_service_token: str | None = Header(default=None)) -> dict[str, object]:
    require_service_token(x_ml_service_token)
    if model is None:
        raise HTTPException(status_code=503, detail="Train and configure the image model first")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image files are supported")

    try:
        image = Image.open(file.file).convert("RGB").resize(IMAGE_SIZE)
        values = np.asarray(image, dtype=np.float32)[None, ...]
        probabilities = model.predict(values, verbose=0)[0]
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Unable to classify image: {error}") from error

    index = int(np.argmax(probabilities))
    label = class_names[index]
    confidence = float(probabilities[index])
    category = category_for_label(label)
    return {
        "category": category,
        "confidence": confidence,
        "findings": [f"Image classifier detected {label.replace('_', ' ')} evidence."],
    }
