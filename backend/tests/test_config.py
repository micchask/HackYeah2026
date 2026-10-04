from app.config import Settings


def test_hosting_database_url_uses_psycopg_driver():
    # Render i inne hostingi podają adres bez sterownika - SQLAlchemy wzięłoby psycopg2
    for url in ("postgresql://u:p@host:5432/app", "postgres://u:p@host:5432/app"):
        assert Settings(database_url=url).database_url == "postgresql+psycopg://u:p@host:5432/app"


def test_explicit_driver_is_kept():
    url = "postgresql+psycopg://app:app@db:5432/app"
    assert Settings(database_url=url).database_url == url
