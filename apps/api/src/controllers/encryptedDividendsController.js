import {
    deleteEncryptedDividendsByUserId,
    insertEncryptedDividends,
    listEncryptedDividends,
    listEncryptedDividendsByUserId,
} from '../data/encryptedDividends.js';

class EncryptedDividendsController {

        static async save(req, res) {
        try {
            const { records } = req.body;
            if (!Array.isArray(records) || records.length === 0) {
                return res.status(400).json({ message: "No records provided" });
            }
    
            const { inserted, duplicated } = await insertEncryptedDividends(records);
    
            return res.status(200).json({
                message: "Operação concluída.",
                inserted,
                duplicated
            });
        } catch (error) {
            console.error("Error saving encrypted dividends:", error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }

    static async findAll(req, res) {
        try {
            const records = await listEncryptedDividends();
            if (records.length === 0) {
                return res.status(404).json({ message: "No records found" });
            }
            res.status(200).json(records);
        } catch (error) {
            console.error("Error fetching encrypted dividends:", error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }

    static async findByUserId(req, res) {
        try {
            const { id } = req.params;
            const records = await listEncryptedDividendsByUserId(id);
            if (records.length === 0) {
                return res.status(200).json({ message: "No records found for this user" });
            }
            res.status(200).json(records);
        } catch (error) {
            console.error("Error finding encrypted dividends:", error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }

    static async deleteByUserId(req, res) {
        try {
            const { userId } = req.params;
            const result = await deleteEncryptedDividendsByUserId(userId);
            if ((result.meta?.changes ?? 0) === 0) {
                return res.status(404).json({ message: "No records found for this user" });
            }
            res.status(200).json({ message: "Records deleted successfully" });
        } catch (error) {
            console.error("Error deleting encrypted dividends:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

}

export default EncryptedDividendsController