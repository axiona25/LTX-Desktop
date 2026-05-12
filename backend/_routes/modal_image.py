"""AXSTUDIO Modal prompt and FLUX image endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from api_types import (
    ModalFluxImageGenerateRequest,
    ModalFluxImageGenerateResponse,
    ModalPromptEnhanceRequest,
    ModalPromptEnhanceResponse,
    ModalPromptTranslateRequest,
    ModalPromptTranslateResponse,
)
from app_handler import AppHandler
from state import get_state_service

router = APIRouter(prefix="/api/modal-image", tags=["modal-image"])


@router.post("/enhance", response_model=ModalPromptEnhanceResponse)
def route_enhance_prompt(
    req: ModalPromptEnhanceRequest,
    handler: AppHandler = Depends(get_state_service),
) -> ModalPromptEnhanceResponse:
    return handler.modal_image.enhance_prompt(req)


@router.post("/translate", response_model=ModalPromptTranslateResponse)
def route_translate_prompt(
    req: ModalPromptTranslateRequest,
    handler: AppHandler = Depends(get_state_service),
) -> ModalPromptTranslateResponse:
    return handler.modal_image.translate_prompt(req)


@router.post("/generate", response_model=ModalFluxImageGenerateResponse)
def route_generate_flux_image(
    req: ModalFluxImageGenerateRequest,
    handler: AppHandler = Depends(get_state_service),
) -> ModalFluxImageGenerateResponse:
    return handler.modal_image.generate_flux_image(req)
