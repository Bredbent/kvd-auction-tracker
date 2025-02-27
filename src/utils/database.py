from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from src.models import Base
from src.utils.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=True)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db() -> AsyncSession:
    async with AsyncSession(engine) as session:
        yield session