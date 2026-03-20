import express from 'express'
import BtgDividendsController from '../controllers/btgDividendsController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js';

const routes = express.Router()

routes.post('/auth/createBtgDividends', BtgDividendsController.createBtgDividends)
routes.get('/auth/getBtgDividendsByUserId/:id', BtgDividendsController.getBtgDividendsByUserId)

export default routes