import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Token não enviado"
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Token inválido"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "segredo_dev"
    );

    req.user = decoded;

    next();
  } catch (err) {
    return res.status(401).json({
      error: "Não autorizado"
    });
  }
}
