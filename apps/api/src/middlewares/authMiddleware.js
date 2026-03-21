import jwt from "jsonwebtoken";
import { getJwtSecret } from '../utils/security.js';

export function authenticateToken(req, res, next) {
    // Tenta pegar o token do cookie ou do header Authorization
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return res.status(401).json({ msg: "Access token not found" });
    }
    try {
        const decoded = jwt.verify(token, getJwtSecret());
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ msg: "Invalid access token" });
    }
}
