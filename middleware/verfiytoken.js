const jwt = require('jsonwebtoken');
const verfiyToken = (req,res,next) => {
    const authHeader = req.headers["Authorization"] || req.headers["authorization"]
    if (!authHeader) {
        return res.status(401).json("Unauthorized access")
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY)
        req.decoded = decoded
        next()
    } catch (err) {
        res.status(500).json("invalid token")
    }


}

module.exports = verfiyToken;
