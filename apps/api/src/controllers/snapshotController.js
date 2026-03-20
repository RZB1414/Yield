import CryptoJS from 'crypto-js';
import { Snapshot } from '../models/Snapshot.js';

class SnapshotController {
  static async getUserSnapshots(req, res) {
    try {
      const secretKey = process.env.CRYPTO_SECRET;
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

      const filter = all
        ? { userId }
        : { userId, tradingDate: { $gte: fromDate, $lte: toDate } };

      const total = await Snapshot.countDocuments(filter);
      const docs = await Snapshot.find(filter)
        .sort({ tradingDate: -1, symbolHash: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const decryptStr = (val) => {
        if (val == null) return null;
        try {
          const s = CryptoJS.AES.decrypt(val, secretKey).toString(CryptoJS.enc.Utf8);
          return s || null;
        } catch {
          return null;
        }
      };
      const decryptNum = (val) => {
        const s = decryptStr(val);
        const n = s != null ? parseFloat(s) : null;
        return Number.isFinite(n) ? n : null;
      };

      const items = docs.map(d => ({
        userId: d.userId,
        symbol: decryptStr(d.symbol),
        currency: decryptStr(d.currency),
        closePrice: decryptNum(d.closePrice),
        dayChange: decryptNum(d.dayChange),
        dayChangePercent: decryptNum(d.dayChangePercent),
        fxUSDBRL: decryptNum(d.fxUSDBRL),
        fxBRLUSD: decryptNum(d.fxBRLUSD),
        totalValueUSD: decryptNum(d.totalValueUSD),
        totalValueBRL: decryptNum(d.totalValueBRL),
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
