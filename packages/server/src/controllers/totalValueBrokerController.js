import { totalValueBroker } from "../models/TotalValueBoker.js"
import CryptoJS from "crypto-js"

class TotalValueBrokerController {

    static async createTotalValueBroker(req, res) {

        const { date, currency, totalValueInUSD, totalValueInBRL, broker, userId } = req.body;
        console.log("Creating total value broker with data:", req.body);
        
        if (!date || !currency || !totalValueInUSD || !totalValueInBRL || !broker || !userId) {
            return res.status(200).json({ msg: "All fields are required" });
        }
        try {

            const d = new Date(date);
            const month = d.getUTCMonth();
            const year = d.getUTCFullYear();

            // Busca por corretora e mês/ano (ignorando o dia e fuso horário)
            const existingEntry = await totalValueBroker.findOne({
                "broker._id": broker._id,
                $expr: {
                    $and: [
                        { $eq: [{ $month: "$date" }, month + 1] }, // $month é 1-based
                        { $eq: [{ $year: "$date" }, year] }
                    ]
                }
            })

            if (existingEntry) {
                return res.status(200).json({ msg: "An entry for this broker already exists this month" });
            }

            // Criptografa os valores antes de salvar
            const secretKey = process.env.CRYPTO_SECRET;
            const encryptedCurrency = CryptoJS.AES.encrypt(currency, secretKey).toString();
            const encryptedUSD = CryptoJS.AES.encrypt(totalValueInUSD.toString(), secretKey).toString();
            const encryptedBRL = CryptoJS.AES.encrypt(totalValueInBRL.toString(), secretKey).toString();


            // Criptografa campos sensíveis do objeto broker conforme o schema
            const brokerToSave = { ...broker };
            if (brokerToSave.broker) brokerToSave.broker = CryptoJS.AES.encrypt(brokerToSave.broker, secretKey).toString();
            if (brokerToSave.currency) brokerToSave.currency = CryptoJS.AES.encrypt(brokerToSave.currency, secretKey).toString();
            if (brokerToSave.userId) brokerToSave.userId = CryptoJS.AES.encrypt(brokerToSave.userId, secretKey).toString();

            // Salva a data normalizada
            const newTotalValueBroker = new totalValueBroker({
                date: date,
                currency: encryptedCurrency,
                totalValueInUSD: encryptedUSD,
                totalValueInBRL: encryptedBRL,
                broker: brokerToSave,
                userId
            });

            await newTotalValueBroker.save();
            res.status(201).json({ msg: 'New Total Value Created', data: newTotalValueBroker });
        } catch (error) {
            res.status(500).json({ msg: "Error creating total value broker", error: error.message })

        }
    }

    static async getAllTotalValueBrokers(req, res) {
        const { id } = req.params
        try {
            const secretKey = process.env.CRYPTO_SECRET;
            const totalValueBrokers = await totalValueBroker.find({ userId: id });
            // Descriptografa os campos de cada registro
            const decryptedBrokers = totalValueBrokers.map(item => {
                let currency = item.currency;
                let totalValueInUSD = item.totalValueInUSD;
                let totalValueInBRL = item.totalValueInBRL;
                let broker = item.broker;
                try {
                    currency = CryptoJS.AES.decrypt(item.currency, secretKey).toString(CryptoJS.enc.Utf8);
                    totalValueInUSD = CryptoJS.AES.decrypt(item.totalValueInUSD, secretKey).toString(CryptoJS.enc.Utf8);
                    totalValueInBRL = CryptoJS.AES.decrypt(item.totalValueInBRL, secretKey).toString(CryptoJS.enc.Utf8);
                    // Descriptografa campos do objeto broker
                    if (broker && typeof broker === 'object') {
                        // Se vier como documento Mongoose, pega só o _doc
                        if (broker._doc) broker = broker._doc;
                        broker = { ...broker };
                        if (broker.broker) broker.broker = CryptoJS.AES.decrypt(broker.broker, secretKey).toString(CryptoJS.enc.Utf8);
                        if (broker.currency) broker.currency = CryptoJS.AES.decrypt(broker.currency, secretKey).toString(CryptoJS.enc.Utf8);
                        if (broker.userId) broker.userId = CryptoJS.AES.decrypt(broker.userId, secretKey).toString(CryptoJS.enc.Utf8);
                    }
                } catch (e) {
                    // Se falhar, retorna os dados como estão
                }
                return {
                    ...item.toObject(),
                    currency,
                    totalValueInUSD,
                    totalValueInBRL,
                    broker
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
            // Calcula o início e o fim do mês com base no monthIndex
            const currentYear = new Date().getFullYear();
            const startOfMonth = new Date(currentYear, monthIndex, 1);
            const endOfMonth = new Date(currentYear, monthIndex + 1, 0);

            // Encontra a entrada correspondente no banco de dados
            const totalValueBrokerEntry = await totalValueBroker.findOne({
                broker: broker,
                date: { $gte: startOfMonth, $lte: endOfMonth }
            });

            if (!totalValueBrokerEntry) {
                return res.status(404).json({ msg: "Total value broker entry not found for the specified month and broker" });
            }

            // Atualiza o campo correspondente (type pode ser "totalValueInUSD" ou "totalValueInBRL")
            if (type === "totalValueInUSD") {
                totalValueBrokerEntry.totalValueInUSD = newValue;
            } else if (type === "totalValueInBRL") {
                totalValueBrokerEntry.totalValueInBRL = newValue;
            } else {
                return res.status(400).json({ msg: "Invalid type. Must be 'totalValueInUSD' or 'totalValueInBRL'" });
            }

            // Salva as alterações no banco de dados
            await totalValueBrokerEntry.save();

            res.status(200).json({ msg: "Total value broker updated successfully", data: totalValueBrokerEntry });
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
            const deletedTotalValueBroker = await totalValueBroker.findByIdAndDelete(id)
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