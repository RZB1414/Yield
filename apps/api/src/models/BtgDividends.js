import mongoose from "mongoose"

const btgDividendsSchema = new mongoose.Schema({
    id: { type: mongoose.Schema.Types.ObjectId },
    date: { type: Date, required: true },
    lancamento: { type: String, required: true },
    ticker: { type: String, required: true },
    valor: { type: Number, required: true },
    userId: { type: String, required: true }
})

btgDividendsSchema.index(
    { userId: 1, date: 1, lancamento: 1, ticker: 1, valor: 1 },
    { unique: true }
)

const btgDividends = mongoose.model("btgDividends", btgDividendsSchema)
export { btgDividends, btgDividendsSchema }