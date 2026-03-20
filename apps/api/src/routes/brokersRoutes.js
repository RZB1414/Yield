import express from 'express'
import BrokerController from '../controllers/brokerController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'

const routes = express.Router()

routes.post('/auth/createBroker', authenticateToken, BrokerController.createBroker)
routes.get('/auth/getBrokers/:id', authenticateToken, BrokerController.getBrokers)

export default routes