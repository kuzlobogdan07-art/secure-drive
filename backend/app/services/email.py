from datetime import datetime
from pathlib import Path


class PasswordResetMailer:
    def __init__(self, mail_dir: Path | None = None) -> None:
        self.mail_dir = mail_dir or Path("mail")

    def send(self, email: str, reset_url: str) -> None:
        self.mail_dir.mkdir(parents=True, exist_ok=True)
        with (self.mail_dir / "reset_emails.log").open("a", encoding="utf-8") as file:
            file.write(f"[{datetime.utcnow().isoformat()}Z] To: {email}\n")
            file.write(f"Reset password link: {reset_url}\n\n")


password_reset_mailer = PasswordResetMailer()


def write_password_reset_email(email: str, reset_url: str) -> None:
    password_reset_mailer.send(email, reset_url)
