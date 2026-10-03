const jwt = require('jsonwebtoken');

const readToken = (req) => {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    return scheme === 'Bearer' && token ? token : null;
};

const verfiyToken = (req, res, next) => {
    const token = readToken(req);
    if (!token) {
        return res.status(401).json({ message: "Unauthorized access" });
    }
    try {
        req.decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
};

// Sets req.decoded when a valid token is sent, but never blocks the request.
verfiyToken.optional = (req, res, next) => {
    const token = readToken(req);
    if (token) {
        try {
            req.decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        } catch (err) {
            req.decoded = undefined;
        }
    }
    next();
};

module.exports = verfiyToken;
