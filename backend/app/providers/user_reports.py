"""Zgłoszenia użytkowników jako źródło danych (po weryfikacji)."""

from app.models import Place, SourceType
from app.providers.base import Provider, register_provider


@register_provider("user_reports")
class UserReportsProvider(Provider):
    source_type = SourceType.USER_REPORT
    base_confidence = 0.4

    def fetch_places(self) -> list[Place]:
        # TODO(api): czytać potwierdzone zgłoszenia z bazy i zamieniać na atrybuty
        return []
