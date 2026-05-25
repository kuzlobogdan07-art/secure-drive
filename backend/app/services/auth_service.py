from datetime import datetime, timedelta
import secrets

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import PasswordResetToken, User
from app.schemas.user import MessageResponse, PasswordResetConfirm, PasswordResetRequest, TokenResponse, UserCreate, UserKeyUpdate, UserLogin
from app.services.email import PasswordResetMailer, password_reset_mailer


class AuthService:
    def __init__(self, db: Session, mailer: PasswordResetMailer = password_reset_mailer) -> None:
        self.db = db
        self.mailer = mailer

    def register(self, payload: UserCreate) -> TokenResponse:
        existing = self.db.scalar(select(User).where(User.email == payload.email.lower()))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(
            email=payload.email.lower(),
            password_hash=hash_password(payload.password),
            public_key=payload.public_key,
            encrypted_private_key=payload.encrypted_private_key,
            private_key_salt=payload.private_key_salt,
            private_key_iv=payload.private_key_iv,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return self._token_response(user)

    def login(self, payload: UserLogin) -> TokenResponse:
        user = self.db.scalar(select(User).where(User.email == payload.email.lower()))
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        return self._token_response(user)

    def update_keys(self, user: User, payload: UserKeyUpdate) -> User:
        user.public_key = payload.public_key
        user.encrypted_private_key = payload.encrypted_private_key
        user.private_key_salt = payload.private_key_salt
        user.private_key_iv = payload.private_key_iv
        self.db.commit()
        self.db.refresh(user)
        return user

    def forgot_password(self, payload: PasswordResetRequest) -> MessageResponse:
        user = self.db.scalar(select(User).where(User.email == payload.email.lower()))
        if user is not None:
            token = secrets.token_urlsafe(48)
            reset_token = PasswordResetToken(
                token=token,
                user_id=user.id,
                expires_at=datetime.utcnow() + timedelta(minutes=30),
            )
            self.db.add(reset_token)
            self.db.commit()

            reset_url = f"{get_settings().frontend_url}/?reset={token}"
            self.mailer.send(user.email, reset_url)

        return MessageResponse(message="If this email exists, a password reset link has been sent")

    def reset_password(self, payload: PasswordResetConfirm) -> MessageResponse:
        reset_token = self.db.scalar(select(PasswordResetToken).where(PasswordResetToken.token == payload.token))
        if reset_token is None or reset_token.used_at is not None or reset_token.expires_at < datetime.utcnow():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

        reset_token.user.password_hash = hash_password(payload.password)
        reset_token.used_at = datetime.utcnow()
        self.db.commit()

        return MessageResponse(message="Password has been reset")

    def _token_response(self, user: User) -> TokenResponse:
        token = create_access_token(str(user.id))
        return TokenResponse(access_token=token, user=user)
