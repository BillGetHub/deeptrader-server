const express = require('express');
const cors = require('cors');

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

// ============================================================
// Real prices from Binance (public market data, no API key)
// ============================================================
const BINANCE_URL =
  'https://data-api.binance.vision/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22SOLUSDT%22%2C%22ADAUSDT%22%2C%22DOTUSDT%22%2C%22MATICUSDT%22%2C%22XRPUSDT%22%2C%22DOGEUSDT%22%5D';

async function fetchBinancePrices() {
  const response = await fetch(BINANCE_URL);
  if (!response.ok) {
    throw new Error(`Binance returned ${response.status}`);
  }
  const data = await response.json();

  const transformed = {};
  data.forEach((item) => {
    const base = item.symbol.replace('USDT', '');
    transformed[`${base}/USD`] = {
      price: parseFloat(item.lastPrice),
      change: parseFloat(item.priceChangePercent),
      high: parseFloat(item.highPrice),
      low: parseFloat(item.lowPrice),
      volume: parseFloat(item.volume),
    };
  });
  return transformed;
}

// ============================================================
// API Endpoints
// ============================================================

// Live prices from Binance
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await fetchBinancePrices();
    res.json(prices);
  } catch (error) {
    console.error('Binance fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch prices from Binance' });
  }
});

// Portfolio (still mock for now — connect to a real source later)
app.get('/api/portfolio', (req, res) => {
  res.json({
    balance: 25000,
    holdings: [
      { symbol: 'BTC', amount: 0.5, value: 22500 },
      { symbol: 'ETH', amount: 2, value: 6400 },
    ],
  });
});

// Trade history (mock)
app.get('/api/trades', (req, res) => {
  res.json([
    { id: 1, symbol: 'BTC', type: 'buy', price: 44500, amount: 0.2, timestamp: '2026-09-08T15:00:00Z' },
    { id: 2, symbol: 'ETH', type: 'sell', price: 3150, amount: 0.5, timestamp: '2026-09-08T14:30:00Z' },
  ]);
});

// Trading signals (mock — this is where strategies will live later)
app.get('/api/signals', (req, res) => {
  res.json([
    { symbol: 'BTC', action: 'BUY', confidence: 85, reason: 'Bullish breakout' },
    { symbol: 'ETH', action: 'HOLD', confidence: 60, reason: 'Consolidation' },
  ]);
});

// Positions (mock)
app.get('/api/positions', (req, res) => {
  res.json([
    { symbol: 'BTC', type: 'LONG', size: 0.5, entryPrice: 44000, currentPrice: 45000, pnl: 500, pnlPercent: 2.27 },
    { symbol: 'ETH', type: 'SHORT', size: 2, entryPrice: 3300, currentPrice: 3200, pnl: 200, pnlPercent: 3.03 },
  ]);
});

// Server status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    serverTime: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    dataSource: 'Binance Public API',
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// Start server
// ============================================================
app.listen(port, '0.0.0.0', () => {
  console.log('✅ DeepTrader API running on http://0.0.0.0:' + port);
  console.log('📊 Data source: Binance Public API');
  console.log('📋 Endpoints:');
  console.log('  /api/prices     ← live Binance prices');
  console.log('  /api/portfolio');
  console.log('  /api/trades');
  console.log('  /api/signals');
  console.log('  /api/positions');
  console.log('  /api/status');
  console.log('  /api/health');
});
