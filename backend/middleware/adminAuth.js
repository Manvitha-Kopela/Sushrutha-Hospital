// backend/middleware/adminAuth.js
// Simple header-based admin auth for the dashboard
export default function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
