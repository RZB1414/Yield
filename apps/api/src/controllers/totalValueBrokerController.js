import {
    createTotalValueBrokerRecord,
    deleteTotalValueBrokerRecord,
    findTotalValueBrokerByUserBrokerMonth,
    listTotalValueBrokersByUserId,
    updateTotalValueBrokerValue,
} from '../data/totalValueBrokers.js';
import { decryptValue, encryptValue } from '../utils/security.js';

class TotalValueBrokerController {

    static async createTotalValueBroker(req, res) {

        const { date, currency, totalValueInUSD, totalValueInBRL, broker, userId } = req.body;
        console.log("Creating total value broker with data:", req.body);
        
        if (!date || !currency || totalValueInUSD === undefined || totalValueInBRL === undefined || !broker || !userId) {
            return res.status(200).json({ msg: "All fields are required" });
        }
        try {
            const existingEntry = await findTotalValueBrokerByUserBrokerMonth(userId, broker._id, date);

            if (existingEntry) {
                return res.status(200).json({ msg: "An entry for this broker already exists this month" });
            }

            const newTotalValueBroker = await createTotalValueBrokerRecord({
                date: date,
                currency: encryptValue(currency),
                totalValueInUSD: encryptValue(totalValueInUSD),
                totalValueInBRL: encryptValue(totalValueInBRL),
                broker: {
                    _id: broker._id,
                    broker: encryptValue(broker.broker),
                    currency: encryptValue(broker.currency),
                    userId: broker.userId ? encryptValue(broker.userId) : null,
                },
                userId
            });

            res.status(201).json({ msg: 'New Total Value Created', data: newTotalValueBroker });
        } catch (error) {
            res.status(500).json({ msg: "Error creating total value broker", error: error.message })

        }
    }

    static async getAllTotalValueBrokers(req, res) {
        const { id } = req.params
        try {
            const totalValueBrokers = await listTotalValueBrokersByUserId(id);
            const decryptedBrokers = totalValueBrokers.map(item => {
                return {
                    _id: item._id,
                    date: item.date,
                    currency: decryptValue(item.currency) ?? item.currency,
                    totalValueInUSD: decryptValue(item.totalValueInUSD) ?? item.totalValueInUSD,
                    totalValueInBRL: decryptValue(item.totalValueInBRL) ?? item.totalValueInBRL,
                    broker: {
                        _id: item.brokerId,
                        broker: decryptValue(item.brokerName) ?? item.brokerName,
                        currency: decryptValue(item.brokerCurrency) ?? item.brokerCurrency,
                        userId: decryptValue(item.brokerUserId) ?? item.brokerUserId,
                    },
                    userId: item.userId,
                };
            });
            res.status(200).json(decryptedBrokers)
            
        } catch (error) {
            res.status(500).json({ msg: "Error fetching total value brokers", error: error.message });
        }
    }

    static async updateTotalValueBroker(req, res) {
        const { broker, monthIndex, type, newValue } = req.body;

        if (!broker || monthIndex === undefined || !type || newValue === undefined) {
            return res.status(400).json({ msg: "All fields (broker, monthIndex, type, newValue) are required" });
        }

        try {
            const currentYear = new Date().getFullYear();
            const startOfMonth = new Date(currentYear, monthIndex, 1);
            const totalValueBrokerEntry = await findTotalValueBrokerByUserBrokerMonth(req.user?.id, broker._id, startOfMonth);

            if (!totalValueBrokerEntry) {
                return res.status(404).json({ msg: "Total value broker entry not found for the specified month and broker" });
            }

            let columnName;
            if (type === "totalValueInUSD") {
                columnName = 'total_value_in_usd';
            } else if (type === "totalValueInBRL") {
                columnName = 'total_value_in_brl';
            } else {
                return res.status(400).json({ msg: "Invalid type. Must be 'totalValueInUSD' or 'totalValueInBRL'" });
            }

            const updatedEntry = await updateTotalValueBrokerValue(totalValueBrokerEntry._id, columnName, encryptValue(newValue));

            res.status(200).json({ msg: "Total value broker updated successfully", data: updatedEntry });
        } catch (error) {
            res.status(500).json({ msg: "Error updating total value broker", error: error.message });
        }
    }

    static async deleteTotalValueBroker(req, res) {
        const { id } = req.params
        if (!id) {
            return res.status(400).send('ID is required')
        }
        try {
            const deletedTotalValueBroker = await deleteTotalValueBrokerRecord(id)
            if (!deletedTotalValueBroker) {
                return res.status(404).send('Total value broker not found')
            }
            res.status(200).json({ message: 'Total value broker deleted', data: deletedTotalValueBroker })
        } catch (error) {
            res.status(500).json({ msg: "Error deleting total value broker", error: error.message })
        }
    }

}

export default TotalValueBrokerController