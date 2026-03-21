import { countSnapshotsByUser, listSnapshotsByUser } from '../data/snapshots.js';
import { decryptNumber, decryptValue } from '../utils/security.js';
import { createStoredTradingDate } from '../utils/normalizers.js';

class SnapshotController {
  static async getUserSnapshots(req, res) {
    try {
      const authUserId = req.user?.id || req.user?._id || req.user;
      // Preferir userId enviado pelo frontend (params ou query); fallback para token
      const userId = req.params.userId || req.query.userId || authUserId;
      if (!userId) {
        return res.status(400).json({ aviso: 'userId não identificado' });
      }

    // Intervalo de datas (UTC). Padrão: últimos 30 dias, a menos que all=true.
      const fromStr = req.query.from; // YYYY-MM-DD
      const toStr = req.query.to; // YYYY-MM-DD
    const all = String(req.query.all || '').toLowerCase() === 'true';
      const now = new Date();
      const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30));
      const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const fromDate = fromStr ? new Date(fromStr) : defaultFrom;
      const toDate = toStr ? new Date(toStr) : defaultTo;

      const page = Math.max(parseInt(req.query.page || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || '500', 10), 1), 2000);
      const skip = (page - 1) * limit;

      const total = await countSnapshotsByUser({
        userId,
        fromDate: createStoredTradingDate(fromDate),
        toDate: createStoredTradingDate(toDate),
        allRecords: all,
      });
      const docs = await listSnapshotsByUser({
        userId,
        fromDate: createStoredTradingDate(fromDate),
        toDate: createStoredTradingDate(toDate),
        allRecords: all,
        limit,
        offset: skip,
      });

      const items = docs.map(d => ({
        userId: d.userId,
        symbol: decryptValue(d.symbol),
        currency: decryptValue(d.currency),
        closePrice: decryptNumber(d.closePrice),
        dayChange: decryptNumber(d.dayChange),
        dayChangePercent: decryptNumber(d.dayChangePercent),
        fxUSDBRL: decryptNumber(d.fxUSDBRL),
        fxBRLUSD: decryptNumber(d.fxBRLUSD),
        totalValueUSD: decryptNumber(d.totalValueUSD),
        totalValueBRL: decryptNumber(d.totalValueBRL),
        tradingDate: d.tradingDate,
        createdAt: d.createdAt
      }));

      return res.json({
        page,
        limit,
        total,
        items
      });
    } catch (e) {
      console.error('[Snapshots] getUserSnapshots error:', e);
      return res.status(500).json({ aviso: 'Erro ao buscar snapshots' });
    }
  }
}

export default SnapshotController;
