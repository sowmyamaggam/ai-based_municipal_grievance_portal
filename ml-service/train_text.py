"""Train/evaluate the municipal work-type classifier.

The selected artifact is a small calibrated linear model: fast, explainable,
and inexpensive to keep warm in the application process.
"""

import argparse
import csv
import json
import random
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from text_preprocessing import normalize_text

SEED = 42


def read_rows(path: Path):
    rows = []
    seen = set()
    with path.open(newline="", encoding="utf-8") as file:
        for row in csv.DictReader(file):
            text = normalize_text(row.get("text", ""))
            label = row.get("work_type", "")
            source = row.get("source", "")
            if text and label and source and (text, label) not in seen:
                seen.add((text, label))
                rows.append((text, label, source))
    return rows


def grouped_split(rows):
    groups = defaultdict(list)
    for index, (_, label, source) in enumerate(rows):
        groups[source].append(index)
    group_items = list(groups.items())
    group_labels = [rows[index_list[0]][1] for _, index_list in group_items]
    train_groups, held_groups = train_test_split(group_items, test_size=0.3, random_state=SEED, stratify=group_labels)
    held_labels = [rows[index_list[0]][1] for _, index_list in held_groups]
    valid_groups, test_groups = train_test_split(held_groups, test_size=0.5, random_state=SEED, stratify=held_labels)
    def flatten(selected):
        return [index for _, index_list in selected for index in index_list]
    return flatten(train_groups), flatten(valid_groups), flatten(test_groups)


def metrics(model, texts, labels):
    predicted = model.predict(texts)
    return {
        "accuracy": round(float(accuracy_score(labels, predicted)), 4),
        "precision_macro": round(float(precision_score(labels, predicted, average="macro", zero_division=0)), 4),
        "recall_macro": round(float(recall_score(labels, predicted, average="macro", zero_division=0)), 4),
        "f1_macro": round(float(f1_score(labels, predicted, average="macro", zero_division=0)), 4),
        "classification_report": classification_report(labels, predicted, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(labels, predicted, labels=sorted(set(labels))).tolist(),
        "labels": sorted(set(labels)),
    }


def best_threshold(model, texts, labels):
    probabilities = model.predict_proba(texts)
    confidence = probabilities.max(axis=1)
    predictions = model.classes_[probabilities.argmax(axis=1)]
    candidates = np.arange(0.35, 0.91, 0.01)
    # A threshold that accepts only one easy validation record is not useful
    # for production. Require at least 60% coverage, then choose the most
    # accurate selective classifier. The rest deliberately goes to Gemini.
    best = (0.5, -1.0, 0.0)
    for threshold in candidates:
        accepted = confidence >= threshold
        coverage = float(accepted.mean())
        if coverage < 0.6:
            continue
        score = f1_score(np.asarray(labels)[accepted], predictions[accepted], average="macro", zero_division=0)
        if score > best[1] or (score == best[1] and coverage > best[2]):
            best = (float(threshold), float(score), coverage)
    return {"threshold": round(best[0], 2), "accepted_validation_f1": round(best[1], 4), "validation_coverage": round(best[2], 4)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/municipal_work_types.csv")
    parser.add_argument("--output", default="artifacts/work_type_model.joblib")
    parser.add_argument("--metadata", default="artifacts/work_type_model.metadata.json")
    args = parser.parse_args()
    random.seed(SEED)
    rows = read_rows(Path(args.data))
    train_indices, valid_indices, test_indices = grouped_split(rows)
    texts = [row[0] for row in rows]
    labels = [row[1] for row in rows]
    candidates = {
        "tfidf-logistic-regression": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True, max_features=20_000)),
            ("classifier", LogisticRegression(max_iter=2_000, C=4, class_weight="balanced", random_state=SEED)),
        ]),
        "tfidf-linear-svm": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True, max_features=20_000)),
            ("classifier", CalibratedClassifierCV(LinearSVC(C=1.5, class_weight="balanced", random_state=SEED), cv=3)),
        ]),
    }
    validation_metrics = {}
    for name, model in candidates.items():
        model.fit([texts[i] for i in train_indices], [labels[i] for i in train_indices])
        validation_metrics[name] = metrics(model, [texts[i] for i in valid_indices], [labels[i] for i in valid_indices])
    selected_name = max(validation_metrics, key=lambda name: validation_metrics[name]["f1_macro"])
    selected = candidates[selected_name]
    # Select the confidence policy solely on a model that has never seen the
    # validation labels. Only then fit the deployment artifact on train+valid.
    threshold = best_threshold(selected, [texts[i] for i in valid_indices], [labels[i] for i in valid_indices])
    selected.fit([texts[i] for i in train_indices + valid_indices], [labels[i] for i in train_indices + valid_indices])
    test_metrics = metrics(selected, [texts[i] for i in test_indices], [labels[i] for i in test_indices])
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": selected, "model_name": selected_name, "model_version": f"{date.today().isoformat()}-{SEED}", "threshold": threshold["threshold"]}, output)
    metadata = {"model_name": selected_name, "model_version": f"{date.today().isoformat()}-{SEED}", "dataset": str(args.data), "training_date": date.today().isoformat(), "records": len(rows), "class_distribution": dict(Counter(labels)), "train_size": len(train_indices), "validation_size": len(valid_indices), "test_size": len(test_indices), "validation_metrics": validation_metrics, "test_metrics": test_metrics, "classification_threshold": threshold["threshold"], "threshold_selection": threshold}
    Path(args.metadata).write_text(json.dumps(metadata, indent=2, default=float), encoding="utf-8")
    print(json.dumps(metadata, indent=2, default=float))


if __name__ == "__main__":
    main()
