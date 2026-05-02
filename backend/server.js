// ============================================================
// Sushruta Hospital – Express API Server
// backend/server.js
// ============================================================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase admin client (service role key – bypasses RLS for admin ops)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // ← use SERVICE key server-side only
);

// Twilio client initialization
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS(to, body) {
  try {
    // Ensure phone number is in E.164 format (adding +91 if missing for Indian numbers)
    let formattedPhone = to.startsWith("+") ? to : `+91${to}`;
    
    const message = await twilioClient.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    console.log(`✅ SMS sent successfully: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error(`❌ SMS failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
app.use(limiter);

// ── APPOINTMENTS ────────────────────────────────────────────

// POST /api/appointments  – book appointment
app.post("/api/appointments", async (req, res) => {
  const { patient_name, phone, doctor, session, appointment_date, age_gender, reason } = req.body;

  if (!patient_name || !phone || !doctor || !session || !appointment_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  const { data, error } = await supabase.from("appointments").insert([
    { patient_name, phone, doctor, session, appointment_date, age_gender, reason, status: "confirmed" }
  ]).select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Send SMS confirmation
  const smsBody = `✅ Hi ${patient_name}, your appointment with ${doctor} on ${appointment_date} (${session}) at Sushruta Hospital is confirmed!`;
  await sendSMS(phone, smsBody);

  return res.json({ success: true, appointment: data });
});

// ── TESTIMONIALS ────────────────────────────────────────────

// GET /api/testimonials  – fetch approved testimonials
app.get("/api/testimonials", async (req, res) => {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// POST /api/testimonials  – submit new testimonial (pending approval)
app.post("/api/testimonials", async (req, res) => {
  const { name, location, rating, message, doctor } = req.body;

  if (!name || !rating || !message) {
    return res.status(400).json({ error: "Name, rating, and message are required" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be 1-5" });
  }

  const { data, error } = await supabase.from("testimonials").insert([
    { name, location, rating, message, doctor, approved: false }
  ]).select().single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, message: "Thank you! Your testimonial will appear after review." });
});

// ── ADMIN ENDPOINTS ─────────────────────────────────────────
// Simple password middleware for admin routes
import adminAuth from "./middleware/adminAuth.js";

// GET /api/admin/appointments
app.get("/api/admin/appointments", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/admin/testimonials  – all (including unapproved)
app.get("/api/admin/testimonials", adminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// PATCH /api/admin/testimonials/:id  – approve or reject
app.patch("/api/admin/testimonials/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;
  const { error } = await supabase
    .from("testimonials")
    .update({ approved })
    .eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

// DELETE /api/admin/testimonials/:id
app.delete("/api/admin/testimonials/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
});

// ── WHATSAPP NOTIFICATION (via Supabase Edge Function) ──────
app.post("/api/notify-whatsapp", async (req, res) => {
  const { phone, name, doctor, date, session } = req.body;
  try {
    const resp = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}` },
      body: JSON.stringify({ phone, name, doctor, date, session })
    });
    const result = await resp.json();
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── SMS TEST ENDPOINT ───────────────────────────────────────
app.post("/api/test-sms", async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: "Phone and message are required" });
  }
  const result = await sendSMS(phone, message);
  if (result.success) {
    return res.json({ success: true, sid: result.sid });
  } else {
    return res.status(500).json({ error: result.error });
  }
});

app.listen(PORT, () => console.log(`✅ Sushruta API running on http://localhost:${PORT}`));
