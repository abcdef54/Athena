import os
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.backend.ai.llms.model_manager import LocalMindModelManager
from src.backend.database.models import InstalledModel
from src.backend.database import crud

class ModelService:
    def __init__(self, manager: LocalMindModelManager, session: AsyncSession) -> None:
        self.manager = manager
        self.session = session

    async def get_installed_models(self) -> list[InstalledModel]:
        await self.sync_local_models()
        return await crud.get_installed_models(self.session)

    async def get_installed_model(self, id: UUID) -> InstalledModel | None:
        return await crud.get_installed_model(id, self.session)

    async def delete_installed_model(self, id: UUID) -> InstalledModel:
        model = await crud.get_installed_model(id, self.session)
        if not model:
            raise ValueError(f"Installed model with ID {id} not found.")
        
        if model.is_default:
            raise ValueError("The built-in default model cannot be deleted.")

        # 1. Delete physical GGUF file
        await self.manager.delete_local_gguf_file(model.local_path)

        # 2. Delete database record
        deleted = await crud.delete_installed_model(id, self.session)
        await self._sync_llama_swap_config()
        return deleted

    async def browse_models(self, query: str | None = None, limit: int = 20):
        return await self.manager.browse_models(query, limit)

    async def list_quants(self, repo_id: str):
        return await self.manager.list_quants(repo_id)

    async def download_model(self, repo_id: str, gguf_filename: str) -> InstalledModel:
        await self.sync_local_models()
        # 1. Download model file
        local_path = await self.manager.download_gguf(repo_id, gguf_filename)
        
        # 2. Extract metadata
        size_bytes = os.path.getsize(local_path)
        from src.backend.ai.llms.huggingface import extract_quant, prettify_name
        quant = extract_quant(gguf_filename)
        author, prettified_name = prettify_name(repo_id)
        display_name = f"{prettified_name} ({quant})"
        model_name = os.path.splitext(gguf_filename)[0]

        # Check if the model is already in DB
        existing = await self.session.execute(
            select(InstalledModel).where(InstalledModel.model_name == model_name)
        )
        existing_model = existing.scalar_one_or_none()
        if existing_model:
            return existing_model

        # 3. Create database record
        new_model = await crud.create_installed_model(
            display_name=display_name,
            model_name=model_name,
            hf_repo=repo_id,
            gguf_file=gguf_filename,
            local_path=local_path,
            quantization=quant,
            size_bytes=size_bytes,
            is_default=False,
            session=self.session
        )
        await self._sync_llama_swap_config()
        return new_model

    async def sync_local_models(self) -> None:
        """Scans the local model directory and registers any untracked GGUF models in PostgreSQL."""
        local_files = await self.manager.list_local_gguf_files()
        installed_models = await crud.get_installed_models(self.session)

        # Delete entries that are no longer on disk or represent secondary split parts
        from src.backend.ai.llms.huggingface import is_secondary_split_part
        cleaned_any = False
        for m in installed_models:
            if is_secondary_split_part(m.gguf_file) or not os.path.exists(m.local_path):
                print(f"[sync_local_models] Deleting stale db model entry: {m.display_name} (path: {m.local_path})")
                await self.session.delete(m)
                cleaned_any = True
        if cleaned_any:
            await self.session.commit()
            installed_models = await crud.get_installed_models(self.session)

        installed_paths = {m.local_path for m in installed_models}

        from src.backend.constants import DEFAULT_MODEL_REPO_ID, DEFAULT_MODEL_GGUF_FILE
        from src.backend.ai.llms.huggingface import extract_quant, prettify_name

        for lf in local_files:
            if lf["local_path"] not in installed_paths:
                filename = lf["filename"]
                if filename == DEFAULT_MODEL_GGUF_FILE:
                    repo_id = DEFAULT_MODEL_REPO_ID
                    is_default = True
                elif "qwen2.5-3b-instruct" in filename.lower():
                    repo_id = "Qwen/Qwen2.5-3B-Instruct-GGUF"
                    is_default = False
                elif "qwen2.5-7b-instruct" in filename.lower():
                    repo_id = "Qwen/Qwen2.5-7B-Instruct-GGUF"
                    is_default = False
                else:
                    repo_id = f"local/{os.path.splitext(filename)[0]}"
                    is_default = False

                quant = extract_quant(filename)
                author, prettified_name = prettify_name(repo_id)
                display_name = f"{prettified_name} ({quant})"
                model_name = os.path.splitext(filename)[0]

                # Check if model name already exists
                existing = await self.session.execute(
                    select(InstalledModel).where(InstalledModel.model_name == model_name)
                )
                if existing.scalar_one_or_none():
                    continue

                await crud.create_installed_model(
                    display_name=display_name,
                    model_name=model_name,
                    hf_repo=repo_id,
                    gguf_file=filename,
                    local_path=lf["local_path"],
                    quantization=quant,
                    size_bytes=lf["size_bytes"],
                    is_default=is_default,
                    session=self.session
                )

        # Self-healing check: Ensure we have at least one default model if models exist in DB
        installed_models = await crud.get_installed_models(self.session)
        if installed_models:
            has_default = any(m.is_default for m in installed_models)
            if not has_default:
                # Find if any model matches DEFAULT_MODEL_GGUF_FILE
                default_candidate = None
                for m in installed_models:
                    if m.gguf_file == DEFAULT_MODEL_GGUF_FILE:
                        default_candidate = m
                        break
                if not default_candidate:
                    default_candidate = installed_models[0]
                
                default_candidate.is_default = True
                await self.session.commit()
                print(f"[sync_local_models] Promoted {default_candidate.display_name} to be the default model.")
        
        await self._sync_llama_swap_config()

    async def _sync_llama_swap_config(self) -> None:
        """Centralized helper to synchronize database models with llama-swap configurations."""
        models = await crud.get_installed_models(self.session)
        models_data = [
            {"model_name": m.model_name, "gguf_file": m.gguf_file}
            for m in models
        ]
        self.manager.write_llama_swap_config(models_data)

