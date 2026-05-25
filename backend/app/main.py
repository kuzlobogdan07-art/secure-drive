from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.routes import auth, files, share
from app.core.config import get_settings
from app.db.models import Base
from app.db.session import engine
from app.services.storage import ensure_storage_dir

settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_runtime_schema() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "users" in table_names:
            user_columns = {column["name"] for column in inspector.get_columns("users")}
            if "public_key" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN public_key TEXT NOT NULL DEFAULT ''"))
            if "encrypted_private_key" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN encrypted_private_key TEXT NOT NULL DEFAULT ''"))
            if "private_key_salt" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN private_key_salt VARCHAR(255) NOT NULL DEFAULT ''"))
            if "private_key_iv" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN private_key_iv VARCHAR(255) NOT NULL DEFAULT ''"))

        if "files" in table_names:
            file_columns = {column["name"] for column in inspector.get_columns("files")}
            if "encryption_mode" not in file_columns:
                connection.execute(text("ALTER TABLE files ADD COLUMN encryption_mode VARCHAR(32) NOT NULL DEFAULT 'symmetric'"))
            if "wrapped_key" not in file_columns:
                connection.execute(text("ALTER TABLE files ADD COLUMN wrapped_key VARCHAR(2048) NOT NULL DEFAULT ''"))


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema()
    ensure_storage_dir()


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(files.router, prefix=settings.api_prefix)
app.include_router(share.router, prefix=settings.api_prefix)
