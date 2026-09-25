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
  'https://data-api.binance.vision/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22SOLUSDT%22%2C%22ADAUSDT%22%2C%22DOTUSDT%22%2C%22MATICUSDT%22%2C%22XRPUSDT%22%2C%22DOGEUSDT%22%2C%22BNBUSDT%22%2C%22LTCUSDT%22%2C%22LINKUSDT%22%2C%22AVAXUSDT%22%2C%22UNIUSDT%22%2C%22ATOMUSDT%22%2C%22FILUSDT%22%2C%22NEARUSDT%22%2C%22ARBUSDT%22%2C%22OPUSDT%22%2C%22INJUSDT%22%2C%22SUIUSDT%22%2C%22APTUSDT%22%2C%22TRXUSDT%22%2C%22SHIBUSDT%22%2C%22PEPEUSDT%22%2C%22SEIUSDT%22%2C%22TIAUSDT%22%2C%22RUNEUSDT%22%2C%22ETCUSDT%22%2C%22ALGOUSDT%22%2C%22VETUSDT%22%2C%22ICPUSDT%22%2C%22POLUSDT%22%2C%22HBARUSDT%22%2C%22GRTUSDT%22%2C%22SANDUSDT%22%2C%22MANAUSDT%22%2C%22AXSUSDT%22%2C%22CHZUSDT%22%2C%22ENJUSDT%22%2C%22ZILUSDT%22%2C%22ONEUSDT%22%2C%22CELOUSDT%22%2C%22KSMUSDT%22%2C%22ZECUSDT%22%2C%22DASHUSDT%22%2C%22XMRUSDT%22%2C%22QNTUSDT%22%2C%22CRVUSDT%22%2C%22SNXUSDT%22%2C%22COMPUSDT%22%5D';

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

// Real historical prices for sparklines (last 24 hours, hourly)
app.get('/api/sparkline/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase(); // e.g. BTCUSDT
    const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Binance returned ' + response.status);
    }
    const data = await response.json();
    // Binance kline format: [openTime, open, high, low, close, volume, ...]
    // We want the close prices (index 4)
    const closes = data.map(k => parseFloat(k[4]));
    res.json(closes);
  } catch (error) {
    console.error('Klines fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch klines' });
  }
});

// Historical klines for charts
// interval: 1m, 5m, 15m, 1h, 4h, 1d
// limit: number of candles (max 500)
app.get('/api/klines/:symbol/:interval', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const interval = req.params.interval;
    const limit = req.query.limit || 24;

    // Map UI interval to Binance interval + limit
    const intervalMap = {
      '1H': { interval: '1m', limit: 60 },
      '24H': { interval: '1h', limit: 24 },
      '7D': { interval: '4h', limit: 42 },
      '30D': { interval: '1d', limit: 30 },
    };

    const mapped = intervalMap[interval] || { interval: '1h', limit: 24 };

    const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${mapped.interval}&limit=${mapped.limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Binance returned ' + response.status);
    }
    const data = await response.json();
    // Return simplified: [{ time, price }, ...]
    const candles = data.map((k) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
    }));    
    res.json(candles);
  } catch (error) {
    console.error('Klines error:', error.message);
    res.status(500).json({ error: 'Failed to fetch klines' });
  }
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
