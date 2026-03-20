import { broker } from "../models/Broker.js"
import CryptoJS from "crypto-js"

class BrokerController {

    static async createBroker(req, res) {
        const { brokerName, currency, userId } = req.body
        if (!brokerName || !currency || !userId) {
            return res.status(400).send('Broker name and currency are required')
        }

        // Encrypt broker data
            const secretKey = process.env.CRYPTO_SECRET;
            const encryptedBrokerName = CryptoJS.AES.encrypt(brokerName, secretKey).toString();
            const encryptedCurrency = CryptoJS.AES.encrypt(currency, secretKey).toString();

        try {
            const newBroker = new broker({
                broker: encryptedBrokerName,
                currency: encryptedCurrency,
                userId: userId
            })
            const brokerResponse = {
                broker: brokerName,
                currency: currency,
                userId: userId
            }

            await newBroker.save()
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
            const brokers = await broker.find({ userId: id });
            // Decrypt broker data
            const secretKey = process.env.CRYPTO_SECRET;
            const decryptedBrokers = brokers.map(item => {
                let brokerName = item.broker;
                let currency = item.currency;
                try {
                    brokerName = CryptoJS.AES.decrypt(item.broker, secretKey).toString(CryptoJS.enc.Utf8);
                    currency = CryptoJS.AES.decrypt(item.currency, secretKey).toString(CryptoJS.enc.Utf8);
                } catch (e) {
                    // If decryption fails, return the data as is
                }
                return {
                    ...item.toObject(),
                    broker: brokerName,
                    currency
                };
            });

            res.status(200).json(decryptedBrokers);
        } catch (error) {
            res.status(500).json({ msg: "Error fetching brokers", error: error.message });
        }
    }

}

export default BrokerController