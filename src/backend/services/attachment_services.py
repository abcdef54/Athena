import os
import asyncio
import shutil
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4
from src.backend.database import crud
from src.backend.database.models import Attachment
from src.backend.database.schemas import FileInfo
from src.backend.ai.langchain import LocalMindVectorDB
from src.backend import constants as CONST

class AttachmentService:
    def __init__(self, db: LocalMindVectorDB, session: AsyncSession):
        self.db = db
        self.session = session

    async def upload_attachment(
        self,
        conversation_id: UUID,
        file: UploadFile
    ):
        file_info = await self._save_file(file)

        await self.db.ingest(
            file_path=file_info.file_path,
            attachment_id=file_info.file_id,
        )

        result = await crud.create_attachment_record(
            conversation_id=conversation_id,
            file_id=file_info.file_id,
            file_name=file_info.file_name,
            file_path=file_info.file_path,
            file_type=file_info.file_type,
            file_size=file_info.file_size,
            session=self.session
        )

        return result
        

    async def delete_attachment(
        self,
        conversation_id: UUID,
        file_id: UUID
    ) -> dict:
        await self.db.delete_file(str(file_id))
        deleted_attachment = await crud.remove_attachment_record(
            conversation_id,
            file_id,
            self.session
        )

        try:
            os.remove(deleted_attachment["file_path"])
        except (FileNotFoundError, KeyError):
            pass

        return deleted_attachment

    async def get_attachments(self) -> list[Attachment]|None:
        return await crud.get_attachments(session=self.session)

    async def get_conversation_attachments(self, conversation_id: UUID) -> list[Attachment]|None:
        return await crud.get_conversation_attachments(
            conversation_id=conversation_id,
            session=self.session
        )

    async def _save_file(
        self,
        file: UploadFile
    ) -> FileInfo:
        upload_dir = CONST.ATTACHMENT_UPLOAD_DIR
        os.makedirs(upload_dir, exist_ok=True)

        file_id = uuid4()

        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)

        _, file_ext = os.path.splitext(file.filename)

        saved_filename = f"{file_id}{file_ext}"
        full_path = os.path.join(
            upload_dir,
            saved_filename
        )

        loop = asyncio.get_running_loop()

        def save():
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        await loop.run_in_executor(None, save)

        return FileInfo(
            file_id=file_id,
            file_path=full_path,
            file_size=file_size,
            file_type=file.content_type or f"application/{file_ext.lstrip('.')}",
            file_name=file.filename
        )