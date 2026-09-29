"""
Database engine, session factory, and base model.
Async SQLAlchemy with asyncpg driver.
"""

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Async engine — connection pooling bilan
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=False,
    pool_recycle=3600,
    connect_args={"timeout": 1},
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db():
    """
    FastAPI dependency — har bir request uchun alohida DB session.
    Agar baza ulanmagan bo'lsa None qaytaradi (oflayn/dev rejim).
    """
    session = None
    try:
        session = async_session_factory()
    except Exception:
        yield None
        return

    try:
        yield session
    except Exception:
        # Request davomida xatolik bo'lsa, xatolikni qayta yield qilmasdan tashqariga uzatamiz
        raise
    finally:
        if session is not None:
            try:
                await session.close()
            except Exception:
                pass



async def init_db():
    """Create all tables (faqat development uchun, production'da Alembic ishlatiladi)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Gracefully close the database engine."""
    await engine.dispose()
