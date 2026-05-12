"""AXSTUDIO-owned creative endpoints backed by Modal."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api_types import AxCharacterGenerateRequest, AxFaceSwapRequest, AxModalAssetResponse
from state import get_state_service
from app_handler import AppHandler

router = APIRouter(prefix="/api/ax", tags=["axstudio"])


@router.post("/character/generate", response_model=AxModalAssetResponse)
def route_generate_character(
    req: AxCharacterGenerateRequest,
    handler: AppHandler = Depends(get_state_service),
) -> AxModalAssetResponse:
    return handler.ax_modal.generate_character(req)


@router.post("/face-swap", response_model=AxModalAssetResponse)
def route_face_swap(
    req: AxFaceSwapRequest,
    handler: AppHandler = Depends(get_state_service),
) -> AxModalAssetResponse:
    return handler.ax_modal.face_swap(req)
