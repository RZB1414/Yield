import mongoose from "mongoose"

let connection
let connectionPromise

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

    if (connection?.readyState === 1) {
        return connection
    }

    if (connectionPromise) {
        return connectionPromise
    }

    connectionPromise = mongoose.connect(uri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4,
            maxPoolSize: 10
        })
        .then((mongooseInstance) => {
        console.log('Connected to MongoDB')

        connection = mongooseInstance.connection
        return connection
        })
        .catch((error) => {

        console.error('dbconnect Error:', {
            message: error.message,
            code: error.code,
            name: error.name
        })
        connection = null
        throw error
        })
        .finally(() => {
            if (!connection || connection.readyState !== 1) {
                connectionPromise = null
            }
        })

    return connectionPromise
}

export { dbConnection, connection, resolveMongoUri }