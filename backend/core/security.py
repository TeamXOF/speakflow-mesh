"""Password hashing + token helpers (stdlib only — no extra dependencies)."""
import hashlib
import secrets


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return secrets.compare_digest(candidate, digest)


def new_token() -> str:
    return secrets.token_urlsafe(32)


ACCESS_TOKEN_EXPIRE_SECONDS = 15 * 60  # 15 minutes
REFRESH_TOKEN_EXPIRE_SECONDS = 7 * 24 * 60 * 60  # 7 days
COOKIE_ACCESS_NAME = "access_token"
COOKIE_REFRESH_NAME = "refresh_token"

