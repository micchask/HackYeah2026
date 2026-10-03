from datetime import UTC, datetime

from app.models import AccessibilityAttribute, AttributeKey, AttributeStatus, Provenance, SourceType
from app.normalization import merge_attributes

NOW = datetime(2026, 10, 3, tzinfo=UTC)


def attr(value, source: str, confidence: float, verified: datetime = NOW):
    return AccessibilityAttribute(
        key=AttributeKey.ELEVATOR,
        value=value,
        provenance=Provenance(
            source=source, source_type=SourceType.OSM, fetched_at=verified, last_verified=verified
        ),
        confidence=confidence,
    )


def test_agreeing_sources_are_verified():
    merged = merge_attributes([attr(True, "osm", 0.6), attr(True, "msip", 0.7)], now=NOW)
    assert merged.status == AttributeStatus.VERIFIED
    assert merged.confidence > 0.7


def test_conflict_is_detected():
    merged = merge_attributes([attr(True, "osm", 0.6), attr(False, "msip", 0.8)], now=NOW)
    assert merged.status == AttributeStatus.CONFLICTING
    assert merged.value is False
    assert merged.alternatives[0].provenance.source == "osm"


def test_old_data_is_outdated():
    merged = merge_attributes([attr(True, "osm", 0.6, datetime(2020, 1, 1, tzinfo=UTC))], now=NOW)
    assert merged.status == AttributeStatus.OUTDATED
