from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from typing import Optional

from src.backend.database.schemas import (
    InstalledModelResponse,
    HFModelBrowseResponse,
    HFQuantResponse,
    DownloadModelRequest
)
from src.backend.services.model_services import ModelService
from src.backend.routes.dependencies import get_model_service

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=list[InstalledModelResponse])
async def get_installed_models(
    model_service: ModelService = Depends(get_model_service)
) -> list[InstalledModelResponse]:
    try:
        models = await model_service.get_installed_models()
        return models
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/browse", response_model=list[HFModelBrowseResponse])
async def browse_models(
    query: Optional[str] = None,
    limit: int = 20,
    model_service: ModelService = Depends(get_model_service)
) -> list[HFModelBrowseResponse]:
    try:
        return await model_service.browse_models(query=query, limit=limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{id}", response_model=InstalledModelResponse)
async def get_installed_model(
    id: UUID,
    model_service: ModelService = Depends(get_model_service)
) -> InstalledModelResponse:
    model = await model_service.get_installed_model(id)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID {id} not found."
        )
    return model


@router.delete("/{id}", response_model=InstalledModelResponse)
async def delete_installed_model(
    id: UUID,
    model_service: ModelService = Depends(get_model_service)
) -> InstalledModelResponse:
    try:
        deleted_model = await model_service.delete_installed_model(id)
        return deleted_model
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{repo_id:path}/quants", response_model=list[HFQuantResponse])
async def list_quants(
    repo_id: str,
    model_service: ModelService = Depends(get_model_service)
) -> list[HFQuantResponse]:
    try:
        return await model_service.list_quants(repo_id=repo_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/download", response_model=InstalledModelResponse)
async def download_model(
    request: DownloadModelRequest,
    model_service: ModelService = Depends(get_model_service)
) -> InstalledModelResponse:
    try:
        installed_model = await model_service.download_model(
            repo_id=request.repo_id,
            gguf_filename=request.gguf_filename
        )
        return installed_model
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model download or registration failed: {str(e)}"
        )
