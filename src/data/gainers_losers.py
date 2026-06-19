"""
Gainers and losers helpers — thin wrapper kept for import compatibility.
The main logic now lives in market_data.py.
"""
from src.data.market_data import fetch_gainers_losers, fetch_gainers_losers_yfinance

__all__ = ["fetch_gainers_losers", "fetch_gainers_losers_yfinance"]
