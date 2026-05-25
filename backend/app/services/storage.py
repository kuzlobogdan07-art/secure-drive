import hashlib
import secrets
from pathlib import Path

from fastapi import UploadFile

from app.core.config import get_settings


class FileStorageService:
    def ensure_dir(self) -> Path:
        storage_dir = get_settings().storage_dir
        storage_dir.mkdir(parents=True, exist_ok=True)
        return storage_dir

    async def save_upload(self, upload: UploadFile) -> tuple[str, int, str]:
        storage_dir = self.ensure_dir()
        storage_name = secrets.token_urlsafe(24)
        target = storage_dir / storage_name
        digest = hashlib.sha256()
        size = 0

        with target.open("wb") as file_out:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                digest.update(chunk)
                file_out.write(chunk)

        return storage_name, size, digest.hexdigest()

    def file_path(self, storage_name: str) -> Path:
        return self.ensure_dir() / storage_name

    def delete_file(self, storage_name: str) -> None:
        path = self.file_path(storage_name)
        if path.exists():
            path.unlink()


storage_service = FileStorageService()


def ensure_storage_dir() -> Path:
    return storage_service.ensure_dir()


async def save_upload(upload: UploadFile) -> tuple[str, int, str]:
    return await storage_service.save_upload(upload)


def file_path(storage_name: str) -> Path:
    return storage_service.file_path(storage_name)


def delete_file(storage_name: str) -> None:
    storage_service.delete_file(storage_name)
