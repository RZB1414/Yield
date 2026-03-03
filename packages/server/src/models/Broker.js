import mongoose from "mongoose"

const brokerSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    broker: { type: String, required: true },
    currency: { type: String, required: true },
    userId: { type: String, required: true }
})

const broker = mongoose.model("brokers", brokerSchema)

export { broker, brokerSchema }