from datetime import datetime
import re

from pydantic import BaseModel, EmailStr, Field, field_validator


PASSWORD_ALLOWED_PATTERN = re.compile(r"^[A-Za-z0-9!@#$%^&*()_\-+=\[\]{};:'\",.<>/?\\|`~]+$")
PASSWORD_UPPER_PATTERN = re.compile(r"[A-Z]")
PASSWORD_LOWER_PATTERN = re.compile(r"[a-z]")
PASSWORD_SYMBOL_PATTERN = re.compile(r"[^A-Za-z0-9]")


def validate_password_rules(password: str) -> str:
    if not PASSWORD_ALLOWED_PATTERN.fullmatch(password):
        raise ValueError("Password must contain only Latin letters, numbers, and symbols")
    if not PASSWORD_UPPER_PATTERN.search(password):
        raise ValueError("Password must include at least one uppercase Latin letter")
    if not PASSWORD_LOWER_PATTERN.search(password):
        raise ValueError("Password must include at least one lowercase Latin letter")
    if not PASSWORD_SYMBOL_PATTERN.search(password):
        raise ValueError("Password must include at least one symbol")
    return password


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    public_key: str = ""
    encrypted_private_key: str = ""
    private_key_salt: str = ""
    private_key_iv: str = ""

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, password: str) -> str:
        return validate_password_rules(password)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=32, max_length=160)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, password: str) -> str:
        return validate_password_rules(password)


class MessageResponse(BaseModel):
    message: str


class UserKeyUpdate(BaseModel):
    public_key: str
    encrypted_private_key: str
    private_key_salt: str
    private_key_iv: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    public_key: str
    encrypted_private_key: str
    private_key_salt: str
    private_key_iv: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
