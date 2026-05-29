from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import unquote, urlparse


@dataclass(frozen=True)
class MySqlConfig:
    host: str
    port: int
    user: str
    password: str
    database: str


def parse_mysql_url(url: str) -> MySqlConfig:
    parsed = urlparse(url)
    if parsed.scheme not in ("mysql", "mysql+pymysql"):
        raise ValueError("mysql url must start with mysql:// or mysql+pymysql://")
    if not parsed.hostname:
        raise ValueError("mysql url must include host")
    database = parsed.path.lstrip("/")
    if not database:
        raise ValueError("mysql url must include database name")

    return MySqlConfig(
        host=parsed.hostname,
        port=parsed.port or 3306,
        user=unquote(parsed.username or ""),
        password=unquote(parsed.password or ""),
        database=database,
    )


def connect_mysql(url: str):
    """Create a PyMySQL connection for runtime imports."""

    try:
        import pymysql
    except ImportError as exc:
        raise RuntimeError(
            "PyMySQL is required for --mysql-url. Install pipeline dependencies first."
        ) from exc

    config = parse_mysql_url(url)
    return pymysql.connect(
        host=config.host,
        port=config.port,
        user=config.user,
        password=config.password,
        database=config.database,
        charset="utf8mb4",
        autocommit=False,
    )
