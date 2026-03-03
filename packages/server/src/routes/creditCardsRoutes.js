import express from 'express'
import CreditCardController from '../controllers/creditCardController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'

const routes = express.Router()

routes.post('/auth/createCardTransaction', authenticateToken, CreditCardController.createCardTransaction)
routes.get('/auth/getAllCreditCards/:id', authenticateToken, CreditCardController.getAllCreditCards)
routes.delete('/auth/deleteCardTransaction/:id', authenticateToken, CreditCardController.deleteCreditCard)

export default routes