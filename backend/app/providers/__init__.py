# Import modułów rejestruje providery w rejestrze (dekorator @register_provider).
from app.providers import (  # noqa: F401
    declarations,
    krakow_open_data,
    manual,
    msip,
    osm,
    user_reports,
)
from app.providers.base import Provider, get_provider_class, register_provider, registered_providers

__all__ = ["Provider", "get_provider_class", "register_provider", "registered_providers"]
