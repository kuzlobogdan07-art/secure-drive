from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.models import ShareLink, StoredFile, User
from app.db.session import get_db
from app.schemas.file import FileRead, ShareLinkRead
from app.services.crypto import create_share_token
from app.services.security_log import log_shared_decryption_failures
from app.services.storage import file_path
from app.utils.helpers import not_found

router = APIRouter(prefix="/share", tags=["share"])


@router.post("/{file_id}", response_model=ShareLinkRead, status_code=status.HTTP_201_CREATED)
def create_link(
    file_id: int,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ShareLinkRead:
    stored = db.get(StoredFile, file_id)
    if stored is None or stored.owner_id != user.id:
        raise not_found("File not found")

    share = ShareLink(token=create_share_token(), file_id=stored.id)
    db.add(share)
    db.commit()
    db.refresh(share)

    return ShareLinkRead(
        token=share.token,
        url=str(request.url_for("shared_file_metadata", token=share.token)),
    )


@router.get("/{token}", response_model=FileRead, name="shared_file_metadata")
def shared_file_metadata(token: str, db: Session = Depends(get_db)) -> StoredFile:
    share = db.scalar(select(ShareLink).where(ShareLink.token == token))
    if share is None:
        raise not_found("Share link not found")
    return share.file


@router.get("/{token}/download")
def download_shared_file(token: str, db: Session = Depends(get_db)) -> FileResponse:
    share = db.scalar(select(ShareLink).where(ShareLink.token == token))
    if share is None:
        raise not_found("Share link not found")

    stored = share.file
    path = file_path(stored.storage_name)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="File content is missing")

    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=f"{stored.original_name}.encrypted",
    )


@router.post("/{token}/failed-decryption", status_code=status.HTTP_204_NO_CONTENT)
def report_failed_decryption(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    share = db.scalar(select(ShareLink).where(ShareLink.token == token))
    if share is None:
        raise not_found("Share link not found")

    log_shared_decryption_failures(
        request=request,
        token=token,
        file_id=share.file_id,
        attempts=3,
    )
