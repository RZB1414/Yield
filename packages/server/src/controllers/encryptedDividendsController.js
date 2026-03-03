import { encryptedDividends } from "../models/EncryptedDividends.js"

class EncryptedDividendsController {

        static async save(req, res) {
        try {
            const { records } = req.body;
            if (!Array.isArray(records) || records.length === 0) {
                return res.status(400).json({ message: "No records provided" });
            }
    
            let insertedCount = 0;
            let duplicatedCount = 0;
    
            try {                
                const result = await encryptedDividends.insertMany(records, { ordered: false });
                insertedCount = result.length;
                duplicatedCount = records.length - insertedCount;
            } catch (error) {
                if (error.code === 11000 || error.writeErrors) {
                    insertedCount = error.result?.result?.nInserted || (error.insertedDocs ? error.insertedDocs.length : 0);
                    duplicatedCount = records.length - insertedCount;
                } else {
                    throw error;
                }
            }
    
            return res.status(200).json({
                message: "Operação concluída.",
                inserted: insertedCount,
                duplicated: duplicatedCount
            });
        } catch (error) {
            console.error("Error saving encrypted dividends:", error);
            res.status(500).json({ message: "Internal server error", error: error.message });
        }
    }

    static async findAll(req, res) {
        try {
            const records = await encryptedDividends.find();
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
            const records = await encryptedDividends.find({ userId: id });
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
            const result = await encryptedDividends.deleteMany({ userId });
            if (result.deletedCount === 0) {
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