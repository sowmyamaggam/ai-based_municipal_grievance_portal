# Next Steps: Kaggle Image Model Integration

This guide explains how to replace Gemini image recognition with the local ML image-classification service.

## 1. Prepare the Kaggle dataset

Create a folder-organized dataset under the project root:

```text
data/
  municipal-images/
    pothole/
    garbage/
    drainage/
    streetlight/
    flooding/
    water/
```

Put each image inside the folder representing its class. The folder names become the model labels.

Use classes that match the municipal complaints supported by the portal. If your Kaggle dataset uses different names, rename the folders or update the label mapping in `ml-service/main.py`.

## 2. Open the ML service directory

Use this exact path:

```powershell
cd C:\finalyear\final-year\ml-service
```

If the prompt already shows this path, do not run `cd final-year\ml-service` again:

```text
PS C:\finalyear\final-year\ml-service>
```

## 3. Activate the Python environment

The project uses Python 3.13 and TensorFlow 2.20:

```powershell
.\.venv\Scripts\Activate.ps1
```

If `.venv` does not exist, create it and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## 4. Train the model

From `C:\finalyear\final-year\ml-service`, run:

```powershell
python train.py `
  --data ..\data\municipal-images `
  --output artifacts\municipal-image-model.keras `
  --epochs 12
```

The training script creates:

```text
ml-service/
  artifacts/
    municipal-image-model.keras
    municipal-image-model.classes.json
```

The `artifacts` directory is ignored by Git. Keep the model file together with its matching classes JSON file.

## 5. Start the ML service

Keep the ML service terminal open:

```powershell
$env:MODEL_PATH = "artifacts\municipal-image-model.keras"
uvicorn main:app --host 127.0.0.1 --port 8000
```

The service exposes:

```text
GET  http://127.0.0.1:8000/health
POST http://127.0.0.1:8000/predict
```

## 6. Check the service health

Open a second PowerShell terminal and run:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expected response after training:

```text
status
------
ok
```

If the response is `model_not_loaded`, check that both files exist:

```powershell
Test-Path .\artifacts\municipal-image-model.keras
Test-Path .\artifacts\municipal-image-model.classes.json
```

## 7. Configure the Next.js application

Copy `.env.example` to `.env.local` if `.env.local` does not already exist:

```powershell
cd C:\finalyear\final-year
Copy-Item .env.example .env.local
```

Edit `.env.local` and configure the required values:

```env
MONGODB_URI=your-mongodb-connection-string
AUTH_SECRET=your-long-random-secret
```

Add your optional AI and image model settings:

```env
GEMINI_API_KEY=your-gemini-api-key
ML_IMAGE_MODEL_URL=http://127.0.0.1:8000/predict
```

The `ML_IMAGE_MODEL_URL` value sends uploaded images to the private FastAPI service. It is used only by server-side Next.js code and must not use a `NEXT_PUBLIC_` prefix.

Do not put real passwords, database URLs, or API keys in `.env.example`. That file is only a template. Store real values in `.env.local`.

## 8. Start Next.js

From `C:\finalyear\final-year`:

```powershell
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

Run the ML service and Next.js in separate terminals. Both services must be running for image analysis to work locally.

## 9. Test the complete workflow

1. Sign in as a citizen.
2. Open the new complaint form.
3. Submit a complaint with a supported image.
4. Wait for background analysis to finish.
5. Open the complaint details page.
6. Confirm that the category, confidence, and image findings were updated.
7. Confirm that the image was sent to the ML service and not to Gemini.

The portal still uses Gemini for text analysis, summaries, sentiment, embeddings, and chat when `GEMINI_API_KEY` is configured. The uploaded image is handled by the ML service.

## 10. Improve model quality

Before relying on automatic routing:

- Keep a separate validation/test set that is not used during training.
- Measure accuracy, precision, recall, and a confusion matrix for every class.
- Add varied images from local conditions, lighting, camera angles, and weather.
- Keep an `Other` class or confidence threshold for uncertain images.
- Review incorrect predictions with municipal officers.
- Do not let low-confidence image predictions automatically make safety-critical decisions.
- Record the dataset version, training date, class list, and validation metrics.

## 11. Production checklist

- Keep the ML service on a private network.
- Add authentication between Next.js and the ML service.
- Use durable object storage such as Cloudinary for uploaded images.
- Do not expose `ML_IMAGE_MODEL_URL` to browser code.
- Monitor model accuracy and data drift over time.
- Require officer or administrator review before final municipal action.
- Store the model artifact and classes file as a matched pair.

## Common errors

### `ModuleNotFoundError: No module named 'tensorflow'`

Activate the project environment and install the requirements:

```powershell
cd C:\finalyear\final-year\ml-service
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### `cd` cannot find `final-year\ml-service`

You are probably already inside the ML service directory. Check the prompt with:

```powershell
Get-Location
```

### `model_not_loaded`

Train the model first and ensure `MODEL_PATH` points to the generated `.keras` file:

```powershell
python train.py --data ..\data\municipal-images --output artifacts\municipal-image-model.keras
$env:MODEL_PATH = "artifacts\municipal-image-model.keras"
uvicorn main:app --host 127.0.0.1 --port 8000
```
