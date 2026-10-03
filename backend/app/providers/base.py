"""Bazowa klasa providera danych.

Żeby dodać nowe źródło danych:
1. Utwórz plik w app/providers/, np. warsaw_open_data.py.
2. Zdefiniuj klasę dziedziczącą po Provider i oznacz ją @register_provider("nazwa").
3. Zaimportuj moduł w app/providers/__init__.py.
4. Dodaj wpis `- name: nazwa` w cities/<miasto>.yaml.
"""

from abc import ABC, abstractmethod
from typing import Any, ClassVar

from app.cities import CityConfig
from app.models import Place, SourceType


class Provider(ABC):
    name: ClassVar[str]
    source_type: ClassVar[SourceType]
    # Bazowe zaufanie do źródła (0-1); normalizacja może je korygować
    base_confidence: ClassVar[float] = 0.5

    def __init__(self, city: CityConfig, options: dict[str, Any] | None = None) -> None:
        self.city = city
        self.options = options or {}

    @abstractmethod
    def fetch_places(self) -> list[Place]:
        """Pobiera miejsca z atrybutami dostępności dla bbox miasta.

        Może rzucić wyjątek (sieć, format) - obsługuje to ProviderService (fallback do cache).
        """


_REGISTRY: dict[str, type[Provider]] = {}


def register_provider(name: str):
    def decorator(cls: type[Provider]) -> type[Provider]:
        cls.name = name
        _REGISTRY[name] = cls
        return cls

    return decorator


def get_provider_class(name: str) -> type[Provider]:
    if name not in _REGISTRY:
        raise KeyError(f"Nieznany provider: {name}. Zarejestrowane: {', '.join(_REGISTRY)}")
    return _REGISTRY[name]


def registered_providers() -> list[str]:
    return sorted(_REGISTRY)
