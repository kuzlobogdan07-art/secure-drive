from datetime import datetime

from pydantic import BaseModel


class FileRead(BaseModel):
    id: int
    original_name: str
    content_type: str
    size: int
    encryption_iv: str
    encryption_salt: str
    encryption_mode: str
    wrapped_key: str
    checksum: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ShareLinkRead(BaseModel):
    token: str
    url: str
