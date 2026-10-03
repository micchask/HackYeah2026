from fastapi import APIRouter

from app.mocks.data import mock_route
from app.models import RouteRequest, RouteResponse

router = APIRouter(tags=["routes"])


@router.post("/routes", response_model=RouteResponse)
def plan_route(req: RouteRequest) -> RouteResponse:
    # TODO(routing): app.routing.graph.load_graph + shortest_path + opis segmentów
    return mock_route(req)
