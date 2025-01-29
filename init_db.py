   # Create a temporary Python script for database initialization
   from shared.database import init_db
   import asyncio
   asyncio.run(init_db())