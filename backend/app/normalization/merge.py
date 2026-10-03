"""Łączenie danych z wielu źródeł: wybór wartości, wykrywanie konfliktów, confidence."""

from collections import defaultdict
from datetime import UTC, datetime, timedelta

from app.models import AccessibilityAttribute, AttributeKey, AttributeStatus, Place

# Po tym czasie bez weryfikacji informacja jest "outdated", a jej confidence spada
STALE_AFTER = timedelta(days=365 * 2)
STALE_PENALTY = 0.5
# Każde dodatkowe zgodne źródło podnosi pewność
AGREEMENT_BONUS = 0.15


def _effective_confidence(attr: AccessibilityAttribute, now: datetime) -> float:
    verified = attr.provenance.last_verified or attr.provenance.fetched_at
    if now - verified > STALE_AFTER:
        return attr.confidence * STALE_PENALTY
    return attr.confidence


def merge_attributes(
    attrs: list[AccessibilityAttribute], now: datetime | None = None
) -> AccessibilityAttribute:
    """Scala atrybuty o tym samym kluczu z różnych źródeł w jeden."""
    if not attrs:
        raise ValueError("Brak atrybutów do scalenia")
    now = now or datetime.now(UTC)
    ranked = sorted(attrs, key=lambda a: _effective_confidence(a, now), reverse=True)
    best = ranked[0]
    agreeing = [a for a in ranked[1:] if a.value == best.value]
    disagreeing = [a for a in ranked[1:] if a.value != best.value]

    confidence = min(1.0, _effective_confidence(best, now) + AGREEMENT_BONUS * len(agreeing))
    if disagreeing:
        status = AttributeStatus.CONFLICTING
    elif _effective_confidence(best, now) < best.confidence:
        status = AttributeStatus.OUTDATED
    elif agreeing:
        status = AttributeStatus.VERIFIED
    else:
        status = AttributeStatus.UNVERIFIED

    return best.model_copy(
        update={"confidence": round(confidence, 3), "status": status, "alternatives": disagreeing}
    )


def merge_places(places: list[Place]) -> list[Place]:
    """Scala atrybuty w obrębie każdego miejsca (po id).

    TODO(dane): dopasowanie tego samego obiektu z różnych źródeł (różne id) po odległości i nazwie.
    """
    by_id: dict[str, Place] = {}
    attrs_by_id: dict[str, dict[AttributeKey, list[AccessibilityAttribute]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for place in places:
        by_id.setdefault(place.id, place)
        for attr in place.attributes:
            attrs_by_id[place.id][attr.key].append(attr)
    return [
        place.model_copy(
            update={"attributes": [merge_attributes(a) for a in attrs_by_id[pid].values()]}
        )
        for pid, place in by_id.items()
    ]
