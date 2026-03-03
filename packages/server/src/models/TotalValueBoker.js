import mongoose from "mongoose"
import { brokerSchema } from "./Broker.js"

const totalValueBrokerSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    date: { type: Date, required: true, default: Date.now },
    currency: { type: String, required: true },
    totalValueInUSD: { type: String },
    totalValueInBRL: { type: String },
    broker: brokerSchema,
    userId: { type: mongoose.Schema.Types.ObjectId, required: true }
})

// Índice único para garantir apenas uma entrada por corretora e mês
totalValueBrokerSchema.index(
    { "broker._id": 1, date: 1 },
    { unique: true }
)

const totalValueBroker = mongoose.model("totalValueBrokers", totalValueBrokerSchema)
export { totalValueBroker, totalValueBrokerSchema }