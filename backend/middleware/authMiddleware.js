const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if(!token) { return res.status(401).json({message: "No token provided"}); }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (e) {
    return res.status(400).json({message: "Invalid token"});
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if(req.user.role !== 'admin') {
      return res.status(403).json({message: "Admin access required"});
    } else next();
  });  
};

module.exports = { verifyToken, verifyAdmin };
