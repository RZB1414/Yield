import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId },
    userName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
})

const user = mongoose.model("users", userSchema)

export { user, userSchema }