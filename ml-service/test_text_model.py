"""Regression tests for the trained municipal work-type model."""

import unittest
from pathlib import Path

import joblib

from text_preprocessing import normalize_text


class WorkTypeModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        artifact_path = Path("artifacts/work_type_model.joblib")
        cls.artifact = joblib.load(artifact_path)
        cls.model = cls.artifact["model"]

    def test_expected_categories(self):
        samples = {
            "A dangerous pothole has opened on the main road": "Road",
            "The storm drain is blocked and water is overflowing": "Drainage",
            "Garbage collection has not happened for three days": "Garbage",
            "Street light is not working": "Streetlight",
            "There is no drinking water supply and the pipe is leaking": "Water",
            "Public toilet area is filthy and needs sanitation": "Sanitation",
            "A fallen tree is obstructing the public playground": "Other",
        }
        for text, expected in samples.items():
            with self.subTest(text=text):
                self.assertEqual(self.model.predict([normalize_text(text)])[0], expected)

    def test_artifact_has_confidence_policy(self):
        self.assertEqual(self.artifact["model_name"], "tfidf-linear-svm")
        self.assertGreaterEqual(self.artifact["threshold"], 0.35)
        self.assertLessEqual(self.artifact["threshold"], 0.9)

    def test_empty_text_normalizes_to_empty(self):
        self.assertEqual(normalize_text("  !!! "), "")


if __name__ == "__main__":
    unittest.main()
