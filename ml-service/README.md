# Municipal Models

This private service hosts the primary text work-type model and an optional municipal image model. It is intentionally separate from the Next.js process. Text classification runs locally first; Gemini 3.8 Flash is used only as a validated fallback. The image model artifact is not included in the repository; until one is trained and configured, `/health` reports it as `not_loaded` and `/predict` returns 503 without preventing text inference.

## Run with Docker Compose

From the portal project directory, configure `ML_SERVICE_TOKEN` in `.env.local`, then run:

```powershell
docker compose --env-file .env.local up --build -d ml-service
```

The image trains the text classifier from the checked-in dataset during build and includes that model. The API is published only on `127.0.0.1:8000`; check `http://127.0.0.1:8000/health`. To enable image inference, put `municipal-image-model.keras` and its companion `municipal-image-model.classes.json` in `image-models/` before starting the service. These files are mounted read-only into the container. Rebuild after changing the service code or text training data. Stop the container with `docker compose stop ml-service`.

## Text work-type model

The reproducible pipeline uses a sample of the public [NYC Open Data 311 Service Requests dataset](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9), mapped to seven municipal work types and extended with citizen-style and Telugu/English examples. The final generated CSV is in `data/municipal_work_types.csv`; metadata records the source, class distribution, and generation date.

```powershell
python build_dataset.py --source data/nyc_311_sample.json
python train_text.py
```

`train_text.py` compares TF-IDF + Logistic Regression with TF-IDF + calibrated Linear SVM using grouped train/validation/test splits, saves the selected model to `artifacts/work_type_model.joblib`, and writes measured metrics to `artifacts/work_type_model.metadata.json`.

Run the service with:

```powershell
$env:WORK_TYPE_MODEL_PATH = "artifacts/work_type_model.joblib"
uvicorn main:app --host 127.0.0.1 --port 8000
```

The Next.js server calls `POST /classify-work-type` and `POST /predict`. The service must stay on a private network.

In the verified local environment the text endpoint starts and classifies successfully without TensorFlow because the image model is loaded lazily. The checked-in text artifact was serialized with scikit-learn 1.6.1; use the pinned `requirements.txt` environment for reproducible loading and training. A newer scikit-learn may emit an artifact-version warning.

## Dataset shape

Download a Kaggle dataset whose folders are labels, then rename or map labels to the portal categories:

```text
municipal-images/
  pothole/
  garbage/
  drainage/
  streetlight/
  flooding/
  water/
```

Use classes that are actually represented in your data. Do not train on a dataset whose labels do not match municipal evidence; a high score on unrelated classes will still produce unsafe routing.

## Train

From `C:\finalyear\final-year\ml-service`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python train.py --data ..\data\municipal-images --output artifacts\municipal-image-model.keras --epochs 12
```

If your prompt already shows `PS C:\finalyear\final-year\ml-service>`, do not run `cd final-year\ml-service` again. You are already in the correct directory.

The script writes the Keras model and a matching `.classes.json` file. Keep the model artifact private and version it with the dataset version and validation metrics.

## Run

```powershell
$env:MODEL_PATH = "artifacts/municipal-image-model.keras"
uvicorn main:app --host 127.0.0.1 --port 8000
```

Check `http://127.0.0.1:8000/health`. Then set this in the Next.js `.env.local`:

```env
ML_IMAGE_MODEL_URL=http://127.0.0.1:8000/predict
```

The Next.js server sends up to three uploaded images to `/predict`. Gemini receives complaint text only. The service response must contain `category`, `confidence` from 0 to 1, and a `findings` array. The portal still applies department mappings and deterministic priority rules, and staff must review predictions before action.

## Production checklist

- Keep the service on a private network; do not expose it to browsers.
- Add authentication between the Next.js server and this service.
- Measure per-class precision, recall, confusion matrix, and a held-out municipal test set.
- Add an `Other` or rejection threshold for low-confidence images before automatic routing.
- Monitor drift as phone cameras, lighting, and local conditions change.
