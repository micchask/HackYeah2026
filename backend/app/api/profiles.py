from fastapi import APIRouter

from app.models import LayerId, ModeId, ModePreset, RoutePreferences

router = APIRouter(tags=["profiles"])


def _layers(*enabled: LayerId) -> dict[LayerId, bool]:
    return {layer: layer in enabled for layer in LayerId}


# Bez limitów: RoutePreferences dopuszcza maksymalnie 30% nachylenia i 30 cm krawężnika
_WALK_PREFERENCES = RoutePreferences(
    profile="walk",
    avoid_stairs=False,
    max_incline_percent=30,
    max_kerb_height_cm=30,
    avoid_rough_surface=False,
)

# Jedno źródło presetów dla frontendu (docs/plan-frontend-claude.md §4).
# Etykiety opisują potrzebę, nie niepełnosprawność.
MODE_PRESETS: list[ModePreset] = [
    ModePreset(
        id=ModeId.WHEELCHAIR,
        label="Poruszam się na wózku",
        description="Bez schodów, nachylenie do 6%, krawężnik do 2 cm, omija bruk i kocie łby.",
        icon="♿",
        profile="wheelchair",
        preferences=RoutePreferences(
            profile="wheelchair",
            avoid_stairs=True,
            max_incline_percent=6,
            max_kerb_height_cm=2,
            avoid_rough_surface=True,
        ),
        layers=_layers(LayerId.BARRIERS, LayerId.HEALTH, LayerId.INSTITUTIONS, LayerId.PARKING),
    ),
    ModePreset(
        id=ModeId.SENIOR,
        label="Wolniejsze tempo, mniej podejść",
        description="Bez schodów, nachylenie do 8%, krawężnik do 5 cm, mniej bruku. "
        "Czas liczony dla spokojnego marszu.",
        icon="👴",
        profile="senior",
        preferences=RoutePreferences(
            profile="senior",
            avoid_stairs=True,
            max_incline_percent=8,
            max_kerb_height_cm=5,
            avoid_rough_surface=True,
        ),
        layers=_layers(LayerId.HEALTH, LayerId.REST, LayerId.INSTITUTIONS),
    ),
    ModePreset(
        id=ModeId.TOURIST,
        label="Zwiedzam miasto",
        description="Najkrótsza piesza trasa, schody dozwolone.",
        icon="🧳",
        profile="walk",
        preferences=_WALK_PREFERENCES,
        layers=_layers(LayerId.INSTITUTIONS, LayerId.PLACES, LayerId.EVENTS),
    ),
    ModePreset(
        id=ModeId.STROLLER,
        label="Jestem z wózkiem dziecięcym",
        description="Bez schodów, nachylenie do 10%, krótki bruk jest akceptowalny.",
        icon="👶",
        profile="stroller",
        preferences=RoutePreferences(
            profile="stroller",
            avoid_stairs=True,
            max_incline_percent=10,
            max_kerb_height_cm=5,
            avoid_rough_surface=True,
        ),
        layers=_layers(LayerId.BARRIERS, LayerId.HEALTH, LayerId.REST),
    ),
    ModePreset(
        id=ModeId.GUEST,
        label="Bez profilu",
        description="Zwykła trasa piesza. Tryb możesz zmienić w każdej chwili.",
        icon="👤",
        profile="walk",
        preferences=_WALK_PREFERENCES,
        layers=_layers(LayerId.INSTITUTIONS),
    ),
]


@router.get("/profiles", response_model=list[ModePreset])
def list_profiles() -> list[ModePreset]:
    """Tryby z ekranu startowego: preferencje trasy i domyślne warstwy mapy."""
    return MODE_PRESETS
