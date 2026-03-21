import {
    createCreditCardRecord,
    deleteCreditCardRecord,
    findCreditCardByUserBankMonth,
    listCreditCardsByUserId,
} from '../data/creditCards.js';
import { createBlindIndex, decryptValue, encryptValue } from '../utils/security.js';

class CreditCardController {

    static async createCardTransaction(req, res) {
        const { bank, date, currency, value, userId } = req.body;
        
        if (!bank || !date || !currency || !value || !userId) {
            return res.status(400).json({ msg: "All fields are required" });
        }
        try {
            const bankHash = createBlindIndex(bank.trim().toLowerCase());
            const existingEntry = await findCreditCardByUserBankMonth(userId, bankHash, date);

            if (existingEntry) {
                return res.status(400).json({ msg: "An entry for this bank already exists this month" });
            }

            const newCreditCard = await createCreditCardRecord({
                bank: encryptValue(bank),
                bankHash,
                date,
                currency: encryptValue(currency),
                value: encryptValue(value),
                userId,
            });

            res.status(201).json({ msg: 'New Credit Card Created', data: newCreditCard });
            
        } catch (error) {
            res.status(500).json({ msg: "Error creating credit card", error: error.message });
            
        }
    }

    static async getAllCreditCards(req, res) {
        const { id } = req.params;
        try {
            const creditCards = await listCreditCardsByUserId(id);
            const decryptedCards = [];
            for (const card of creditCards) {
                decryptedCards.push({
                    _id: card._id,
                    bank: decryptValue(card.bank),
                    date: card.date,
                    currency: decryptValue(card.currency),
                    value: Number(decryptValue(card.value)),
                    userId: card.userId,
                });
            }
            res.status(200).json(decryptedCards);
        } catch (error) {
            res.status(500).json({ msg: "Error fetching credit cards", error: error.message });
        }
    }

    static async deleteCreditCard(req, res) {
        const { id } = req.params;
        try {
            const deletedCard = await deleteCreditCardRecord(id);
            if (!deletedCard) {
                return res.status(404).json({ msg: "Credit card not found" });
            }
            res.status(200).json({ msg: "Credit card deleted successfully", data: deletedCard });
        } catch (error) {
            res.status(500).json({ msg: "Error deleting credit card", error: error.message });
        }
    }

}

export default CreditCardController