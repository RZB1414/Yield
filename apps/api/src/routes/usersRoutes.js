import express from 'express'
import UserController from '../controllers/userController.js'
import { authenticateToken } from '../middlewares/authMiddleware.js'

const routes = express.Router()

routes.post('/auth/createUser', UserController.createUser)
routes.post('/auth/login', UserController.login)
routes.get('/auth/getAllUsers', UserController.getAllUsers)
routes.get('/auth/getUser/:id', UserController.getUserById)
routes.get('/auth/me', UserController.getMe)

export default routes