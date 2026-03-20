import express from 'express'
import EncryptedDividendsController from '../controllers/encryptedDividendsController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js';

const routes = express.Router()

routes.post('/auth/save', authenticateToken, EncryptedDividendsController.save)
routes.get('/auth/getAllEncrytedDividends', authenticateToken, EncryptedDividendsController.findAll)
routes.get('/auth/getDividendsById/:id', authenticateToken, EncryptedDividendsController.findByUserId)
routes.delete('/auth/deleteDividendsById/:id', authenticateToken, EncryptedDividendsController.deleteByUserId)

export default routes