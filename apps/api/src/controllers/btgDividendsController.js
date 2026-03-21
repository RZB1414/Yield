import { insertBtgDividends, listBtgDividendsByUserId } from '../data/btgDividends.js';

class BtgDividendsController {

    static async createBtgDividends(req, res) {
        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ msg: 'No records provided' });
        }

        try {
            const { inserted, duplicates } = await insertBtgDividends(records);
            return res.status(200).json({ inserted, duplicates });
        } catch (err) {
            return res.status(500).json({ msg: 'Error inserting records', error: err.message });
        }
    }

    static async getBtgDividendsByUserId(req, res) {
        try {
            const { id } = req.params;
            const records = await listBtgDividendsByUserId(id);
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