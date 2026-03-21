import { createBrokerRecord, listBrokersByUserId } from '../data/brokers.js';
import { decryptValue, encryptValue } from '../utils/security.js';

class BrokerController {

    static async createBroker(req, res) {
        const { brokerName, currency, userId } = req.body
        if (!brokerName || !currency || !userId) {
            return res.status(400).send('Broker name and currency are required')
        }
        try {
            await createBrokerRecord({
                broker: encryptValue(brokerName),
                currency: encryptValue(currency),
                userId,
            });

            const brokerResponse = {
                broker: brokerName,
                currency,
                userId,
            };

            res.status(201).json(brokerResponse)
        } catch (error) {
            res.status(500).json({ msg: "Error creating broker", error: error.message })
        }
    }

    static async getBrokers(req, res) {
        const { id } = req.params;
        try {
            if (!id) {
                return res.status(400).json({ msg: "userId is required" });
            }
            const brokers = await listBrokersByUserId(id);
            const decryptedBrokers = brokers.map((item) => {
                return {
                    _id: item._id,
                    broker: decryptValue(item.broker) ?? item.broker,
                    currency: decryptValue(item.currency) ?? item.currency,
                    userId: item.userId,
                };
            });

            res.status(200).json(decryptedBrokers);
        } catch (error) {
            res.status(500).json({ msg: "Error fetching brokers", error: error.message });
        }
    }

}

export default BrokerController