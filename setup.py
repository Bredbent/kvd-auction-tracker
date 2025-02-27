from setuptools import setup, find_packages

setup(
    name="kvd_auction_tracker",
    version="0.2.0",
    description="KVD Auction Tracker - A service for tracking and analyzing car auctions from KVD.se",
    author="Victor",
    packages=find_packages(),
    python_requires=">=3.11",
    install_requires=[
        "fastapi>=0.109.1",
        "uvicorn>=0.27.0",
        "sqlalchemy>=2.0.25",
        "asyncpg>=0.29.0",
        "pydantic>=2.6.0",
        "pydantic-settings>=2.1.0",
        "selenium>=4.16.0",
        "beautifulsoup4>=4.12.2",
        "pandas>=2.2.0",
        "scipy>=1.12.0",
        "redis>=5.0.1",
    ],
)