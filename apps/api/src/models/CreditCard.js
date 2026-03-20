import mongoose from "mongoose"

const creditCardSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    bank: { type: String, required: true },
    date: { type: Date, required: true, default: Date.now },
    currency: { type: String, required: true },
    value: { type: String, required: true },
    userId: { type: String, required: true }
})

// Índice único para garantir apenas uma entrada por banco e mês
creditCardSchema.index(
    { bank: 1, date: 1 },
    { unique: true }
)

const creditCard = mongoose.model("creditCards", creditCardSchema)
export { creditCard, creditCardSchema }