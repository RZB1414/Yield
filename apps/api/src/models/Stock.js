import mongoose from "mongoose"

const stockSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    symbol: { type: String, required: true },
    currency: { type: String, required: true },
    averagePrice: { type: String },
    stocksQuantity: { type: String },
    userId: { type: String, required: true }
})

stockSchema.index({ userId: 1, symbol: 1 }, { unique: true })
const stock = mongoose.model("stocks", stockSchema)

export { stock, stockSchema }