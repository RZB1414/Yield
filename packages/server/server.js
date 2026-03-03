import 'dotenv/config'
import app from './src/app.js'
import { dbConnection, connection } from './src/config/dbConnect.js'

const port = process.env.PORT || 3000

async function startServer() {
    try {
        await dbConnection()
        
        if (!connection) {
            throw new Error('Database connection failed')
        }
            
            app.listen(port, () => {
                console.log(`Server is running on port ${port}`)
            })

    } catch (error) {
        console.error('Failed to start server:', error)
        process.exit(1)
    }
}

startServer()

export default app