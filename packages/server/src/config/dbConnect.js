import mongoose from "mongoose"

let connection

function resolveMongoUri() {
    if (process.env.MONGO_URI) {
        return process.env.MONGO_URI
    }

    const dbUser = process.env.DB_USER
    const dbPassword = process.env.DB_PASSWORD
    const dbHost = process.env.DB_HOST || "cluster0.y8mug7p.mongodb.net"
    const dbName = process.env.DB_NAME || ""
    const dbOptions = process.env.DB_OPTIONS

    if (!dbUser || !dbPassword) {
        return null
    }

    const encodedUser = encodeURIComponent(dbUser)
    const encodedPassword = encodeURIComponent(dbPassword)
    const path = dbName ? `/${dbName}` : "/"
    const params = dbOptions ? `?${dbOptions}` : ""
    return `mongodb+srv://${encodedUser}:${encodedPassword}@${dbHost}${path}${params}`
}

async function dbConnection() {
    const uri = resolveMongoUri()
    if (!uri) {
        const message = 'MongoDB credentials not configured (MONGO_URI or DB_USER/DB_PASSWORD).'
        console.error('dbconnect Error:', { message })
        throw new Error(message)
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4,
            maxPoolSize: 10
        })
        console.log('Connected to MongoDB')

        connection = mongoose.connection
        const db = connection.db
    } catch (error) {

        console.error('dbconnect Error:', {
            message: error.message,
            code: error.code,
            name: error.name
        })
        connection = null
        return {  message: 'Error connecting to database', error: error.message }
    }
}

export { dbConnection, connection, resolveMongoUri }