from datetime import datetime
from pathlib import Path

from fastapi import Request


ATTACKERS_LOG = Path("security_logs") / "attackers.log"


class SecurityAuditLogger:
    def __init__(self, attackers_log: Path = ATTACKERS_LOG) -> None:
        self.attackers_log = attackers_log

    def log_shared_decryption_failures(self, request: Request, token: str, file_id: int, attempts: int) -> None:
        self.attackers_log.parent.mkdir(parents=True, exist_ok=True)

        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        token_preview = f"{token[:8]}..." if len(token) > 8 else token

        with self.attackers_log.open("a", encoding="utf-8") as file:
            file.write(
                "[{timestamp}] ip={ip} attempts={attempts} file_id={file_id} "
                "share_token={token} user_agent={user_agent}\n".format(
                    timestamp=datetime.utcnow().isoformat() + "Z",
                    ip=client_host,
                    attempts=attempts,
                    file_id=file_id,
                    token=token_preview,
                    user_agent=user_agent.replace("\n", " ").replace("\r", " "),
                )
            )


security_audit_logger = SecurityAuditLogger()


def log_shared_decryption_failures(request: Request, token: str, file_id: int, attempts: int) -> None:
    security_audit_logger.log_shared_decryption_failures(request, token, file_id, attempts)
