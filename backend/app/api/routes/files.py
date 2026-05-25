from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.models import StoredFile, User
from app.db.session import get_db
from app.schemas.file import FileRead
from app.services.storage import delete_file, file_path, save_upload
from app.utils.helpers import not_found

router = APIRouter(prefix="/files", tags=["files"])

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
BLOCKED_EXTENSIONS = {".exe", ".mp4"}


def get_extension(filename: str) -> str:
    dot_index = filename.rfind(".")
    return filename[dot_index:].lower() if dot_index >= 0 else ""


@router.get("", response_model=list[FileRead])
def list_files(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[StoredFile]:
    return list(
        db.scalars(
            select(StoredFile)
            .where(StoredFile.owner_id == user.id)
            .order_by(StoredFile.created_at.desc())
        )
    )


@router.post("", response_model=FileRead, status_code=status.HTTP_201_CREATED)
async def upload_file(
    encrypted_file: UploadFile = File(...),
    original_name: str = Form(...),
    original_content_type: str = Form("application/octet-stream"),
    encryption_iv: str = Form(...),
    encryption_salt: str = Form(...),
    encryption_mode: str = Form("symmetric"),
    wrapped_key: str = Form(""),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StoredFile:
    storage_name, size, checksum = await save_upload(encrypted_file)
    if size > MAX_FILE_SIZE_BYTES:
        delete_file(storage_name)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File is too large. Maximum size is 50 MB.",
        )

    if get_extension(original_name) in BLOCKED_EXTENSIONS:
        delete_file(storage_name)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This file type is not supported.",
        )

    if encryption_mode not in {"symmetric", "asymmetric"}:
        delete_file(storage_name)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported encryption mode.")

    if encryption_mode == "asymmetric" and not wrapped_key:
        delete_file(storage_name)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wrapped key is required.")

    if encryption_mode == "symmetric" and not encryption_salt:
        delete_file(storage_name)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Encryption salt is required.")

    stored = StoredFile(
        owner_id=user.id,
        original_name=original_name,
        content_type=original_content_type or "application/octet-stream",
        size=size,
        storage_name=storage_name,
        encryption_iv=encryption_iv,
        encryption_salt=encryption_salt,
        encryption_mode=encryption_mode,
        wrapped_key=wrapped_key,
        checksum=checksum,
    )
    db.add(stored)
    db.commit()
    db.refresh(stored)
    return stored


@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    stored = db.get(StoredFile, file_id)
    if stored is None or stored.owner_id != user.id:
        raise not_found("File not found")

    path = file_path(stored.storage_name)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="File content is missing")

    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=f"{stored.original_name}.encrypted",
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_file(
    file_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    stored = db.get(StoredFile, file_id)
    if stored is None or stored.owner_id != user.id:
        raise not_found("File not found")

    delete_file(stored.storage_name)
    db.delete(stored)
    db.commit()
