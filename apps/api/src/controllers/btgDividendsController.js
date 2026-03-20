import { btgDividends } from "../models/BtgDividends.js"

class BtgDividendsController {

    static async createBtgDividends(req, res) {
        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ msg: 'No records provided' });
        }

        let inserted = 0;
        let duplicates = 0;

        try {
            const result = await btgDividends.insertMany(records, { ordered: false });
            inserted = result.length;
        } catch (err) {
            if (err && (err.code === 11000 || err.writeErrors)) {
                inserted = err.insertedDocs ? err.insertedDocs.length : (err.result?.result?.nInserted || 0);
                if (Array.isArray(err.writeErrors)) {
                    duplicates = err.writeErrors.filter(e => e.code === 11000).length;
                } else if (err.code === 11000) {
                    duplicates = records.length - inserted; // assume restante duplicado
                }
            } else {
                return res.status(500).json({ msg: 'Error inserting records', error: err.message });
            }
        }

        if (duplicates === 0) {
            const diff = records.length - inserted;
            if (diff > 0) duplicates = diff;
        }

        return res.status(200).json({ inserted, duplicates });
    }

    static async getBtgDividendsByUserId(req, res) {
        try {
            const { id } = req.params;
            const records = await btgDividends.find({ userId: id });
            if (records.length === 0) {
                return res.status(200).json({ message: "No records found for this user" });
            }
            res.status(200).json(records);
        } catch (error) {
            console.error("Error finding BTG dividends:", error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }
}

export default BtgDividendsController