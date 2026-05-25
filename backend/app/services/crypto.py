import secrets


class ShareTokenService:
    def create(self) -> str:
        return secrets.token_urlsafe(32)


share_token_service = ShareTokenService()


def create_share_token() -> str:
    return share_token_service.create()
