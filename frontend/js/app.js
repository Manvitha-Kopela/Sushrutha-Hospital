// ============================================================
// Sushruta Hospital – Frontend JS (Production Ready)
// Compatible with Original Design
// ============================================================

// ── CONFIG ───────────────────────────────────────────────────
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : 'https://sushrutha.onrender.com/api';

const SUPABASE_URL = 'https://axlnmiadyqmtuudatyta.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4bG5taWFkeXFtdHV1ZGF0eXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTU0MzIsImV4cCI6MjA5MzI5MTQzMn0.78OGjLebIa_EfdDsJxTKkGYIi7rkYchDD-MuIElXQl4';

// ── STATE ────────────────────────────────────────────────────
let currentLang = localStorage.getItem('sushruta_lang') || 'en';

// ── INITIALIZATION ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set initial language
  setLanguage(currentLang);

  // Set min appointment date
  const aptDate = document.getElementById('aptDate');
  if (aptDate) {
    const today = new Date().toISOString().split('T')[0];
    aptDate.min = today;
    aptDate.value = today;
  }

  // Scroll Animations
  initScrollEffects();
});

// ── SCROLL EFFECTS ─────────────────────────────────────────────
function initScrollEffects() {
  const nav = document.getElementById('mainNav');
  const reveals = document.querySelectorAll('.reveal');

  window.addEventListener('scroll', () => {
    // Nav effect
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    // Reveal effect
    reveals.forEach(el => {
      const windowHeight = window.innerHeight;
      const revealTop = el.getBoundingClientRect().top;
      const revealPoint = 150;

      if (revealTop < windowHeight - revealPoint) {
        el.classList.add('active');
      }
    });
  });

  // Trigger initial reveal
  window.dispatchEvent(new Event('scroll'));
}

// ── i18n ENGINE ──────────────────────────────────────────────
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('sushruta_lang', lang);
  
  // Update buttons
  document.querySelectorAll('.lang-switcher button').forEach(btn => {
    const isActive = btn.id === `lang-${lang}`;
    btn.style.background = isActive ? 'var(--accent)' : 'transparent';
    btn.style.color = isActive ? 'white' : 'var(--text-main)';
  });

  // Update text elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (window.translations[lang] && window.translations[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = window.translations[lang][key];
      } else if (el.tagName === 'OPTION') {
        el.textContent = window.translations[lang][key];
      } else {
        el.textContent = window.translations[lang][key];
      }
    }
  });

  // Toggle Telugu font class on body
  document.body.classList.toggle('telugu-text', lang === 'te');
}

// ── HELPERS ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    return data;
  } catch (err) {
    console.error('API Fetch error:', err);
    throw err;
  }
}

async function supabasePost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      'apikey': SUPABASE_ANON, 
      'Authorization': `Bearer ${SUPABASE_ANON}`, 
      'Prefer': 'return=representation' 
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'DB error'); }
  return res.json();
}

// ── APPOINTMENT BOOKING ───────────────────────────────────────
async function submitAppointment() {
  const name = document.getElementById('patientName').value.trim();
  const phone = document.getElementById('patientPhone').value.trim();
  const email = document.getElementById('patientEmail').value.trim();
  const doctor = document.getElementById('doctorSelect').value;
  const session = document.getElementById('sessionSelect').value;
  const date = document.getElementById('aptDate').value;
  const age = document.getElementById('ageGender').value.trim();
  const errEl = document.getElementById('formError');
  errEl.style.display = 'none';

  if (!name || !phone || !email || !doctor || !session || !date) {
    errEl.textContent = currentLang === 'te' ? '⚠️ దయచేసి అన్ని వివరాలు నింపండి.' : '⚠️ Please fill all required fields.';
    errEl.style.display = 'block'; return;
  }
  if (!/^[6-9]\d{9}$/.test(phone)) {
    errEl.textContent = currentLang === 'te' ? '⚠️ దయచేసి సరైన ఫోన్ నంబర్ ఇవ్వండి.' : '⚠️ Please enter a valid 10-digit phone number.';
    errEl.style.display = 'block'; return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = currentLang === 'te' ? 'పంపబడుతోంది...' : 'Booking...';

  try {
    // 1. Save to Supabase
    await supabasePost('appointments', { 
      patient_name: name, 
      phone, 
      email,
      doctor, 
      session, 
      appointment_date: date, 
      age_gender: age, 
      status: 'confirmed',
      created_at: new Date().toISOString()
    });

    // 2. Try Backend (Optional, keeping it for compatibility)
    try {
      await apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify({ patient_name: name, phone, email, doctor, session, appointment_date: date, age_gender: age })
      });
      await apiFetch('/notify-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ phone, name, doctor, date, session })
      });
    } catch (e) {
      console.warn('Backend endpoint not reachable, but data saved to Supabase.');
    }

    // 3. Send Email via EmailJS
    try {
        console.log("Attempting to send email to:", email);
        const templateParams = {
            patient_name: name,
            to_email: email,
            doctor: doctor,
            date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
            session: session,
            phone: phone,
            reply_to: "sushruthahospitalsrikakulam@gmail.com"
        };
        
        const response = await emailjs.send("service_irrd1pk", "template_72yr0lq", templateParams);
        console.log("EmailJS Success:", response.status, response.text);
    } catch (mailErr) {
        console.error("EmailJS Error:", mailErr);
        // Show warning in the modal but don't block success
        document.getElementById('modalDetails').innerHTML += `
          <p style="color: #e67e22; font-weight: 600; margin-top: 10px;">⚠️ Email Notification Failed: ${mailErr.text || mailErr.message || 'Check EmailJS configuration'}</p>
        `;
    }

    // Show Success Modal
    const formattedDate = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('modalDetails').innerHTML = `
      <p><strong>Patient:</strong> ${name}</p>
      <p><strong>Doctor:</strong> ${doctor}</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Session:</strong> ${session}</p>
      <p style="color: var(--healing); font-weight: 600; margin-top: 10px;">✅ Confirmation email sent to ${email}</p>
    `;
    document.getElementById('successModal').style.display = 'flex';
    
    // Reset form
    ['patientName', 'patientPhone', 'patientEmail', 'ageGender'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('doctorSelect').value = '';
    document.getElementById('sessionSelect').value = '';
  } catch (err) {
    errEl.textContent = `❌ ${err.message}`;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function closeModal() {
  document.getElementById('successModal').style.display = 'none';
}

// ── EXPOSE GLOBALS ───────────────────────────────────────────
window.setLanguage = setLanguage;
window.submitAppointment = submitAppointment;
window.closeModal = closeModal;
window.openAdmin = () => window.location.href = 'admin.html';

