import 'dotenv/config'
import app from './src/app.js'
import { initializeApp } from './src/bootstrap.js'

const port = process.env.PORT || 5000

async function startServer() {
    try {
        await initializeApp()

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