import { user } from "../models/User.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

class UserController {

    static async createUser(req, res) {
        const { userName, email, password } = req.body;
        if (!userName || !email || !password) {
            return res.status(400).json({ msg: "All fields are required" });
        }
        try {
            // Aplica hash seguro no backend, mesmo que a senha já venha hasheada do front
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const newUser = new user({
                userName,
                email,
                password: hashedPassword
            })
            await newUser.save();
            res.status(201).json({ msg: 'New User Created', data: newUser });
        } catch (error) {
            res.status(500).json({ msg: "Error creating user", error: error.message });
        }
    }

    static async login(req, res) {
        const { email, password } = req.body;
        console.log('Login attempt with email: ', email);

        if (!email || !password) {
            return res.status(400).json({ msg: "Email and password are required" });
        }
        try {
            const foundUser = await user.findOne({ email });
            console.log('Found user: ', foundUser);

            if (!foundUser) {
                return res.status(401).json({ msg: "Invalid email or password" });
            }
            const isMatch = await bcrypt.compare(password, foundUser.password);
            if (!isMatch) {
                console.log('Password does not match for user: ', email);
                
                return res.status(401).json({ msg: "Invalid email or password" });
            }

            // Gera token JWT
            const payload = { id: foundUser._id, email: foundUser.email };
            const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });

            // Retorna o token no corpo da resposta

            console.log('access token', accessToken);
            
            res.status(200).json({ msg: "Login successful", accessToken });
        } catch (error) {
            console.log('Error during login: ', error);
            
            res.status(500).json({ msg: "Error logging in", error: error.message });
        }
    }

    static async getAllUsers(req, res) {
        try {
            const users = await user.find();
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ msg: "Error fetching users", error: error.message });
        }
    }

    static async getUserById(req, res) {
        const { id } = req.params;
        if (!id) {
            return res.status(400).send('ID is required');
        }
        try {
            const foundUser = await user.findById(id);
            if (!foundUser) {
                return res.status(404).send('User not found');
            }
            res.status(200).json(foundUser);
        } catch (error) {
            res.status(500).json({ msg: "Error fetching user", error: error.message });
        }
    }

    static async getMe(req, res) {
        // Espera o token no header Authorization: Bearer <token>
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) return res.status(401).json({ msg: "Access token not found" });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            return res.status(200).json({ id: decoded.id, email: decoded.email });
        } catch (err) {
            return res.status(403).json({ msg: "Invalid access token" });
        }
    }

}

export default UserController