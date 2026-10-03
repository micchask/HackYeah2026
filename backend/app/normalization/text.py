import unicodedata


def normalize(text: str) -> str:
    """Małe litery, bez polskich znaków - do porównywania tekstu ze źródeł."""
    decomposed = unicodedata.normalize("NFKD", text.replace("ł", "l").replace("Ł", "L"))
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()
