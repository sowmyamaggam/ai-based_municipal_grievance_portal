import re
import unicodedata


def normalize_text(value: str) -> str:
    """Stable, language-friendly normalization shared by training and inference."""
    value = unicodedata.normalize("NFKC", value or "").lower()
    value = re.sub(r"\s+", " ", value).strip()
    # Keep Unicode letters (including Telugu) and digits, removing punctuation
    # that otherwise creates sparse one-off features.
    value = re.sub(r"[^\w\s]", " ", value, flags=re.UNICODE)
    return re.sub(r"\s+", " ", value).strip()
