/* server.js */
require('dotenv').config();
require('./db'); // mongoose connection

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const cookieParser = require('cookie-parser');

const app = express();

/* --- CORS & Body parsers --- */
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true // important for cookie auth
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* --- Cookie parser (populate req.cookies) --- */
app.use(cookieParser());

/* --- Static uploads --- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* --- Health check --- */
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

/* --- HTTP + Socket.IO (ต้องมาก่อน mount routes) --- */
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });

/* inject io ให้ controllers/routes ใช้งานได้ผ่าน req.io */
app.use((req, _res, next) => {
  req.io = io;
  next();
});

/* --- Safe require + route mounting helpers --- */
function safeRequire(relPath) {
  try {
    const full = path.join(__dirname, relPath);
    const mod = require(full);
    return { ok: true, mod };
  } catch (err) {
    return { ok: false, error: err };
  }
}
function isRouterLike(router) {
  return (
    typeof router === 'function' ||
    (router && typeof router === 'object' && (typeof router.handle === 'function' || Array.isArray(router.stack)))
  );
}

/* --- Declare mounts (แก้/เพิ่มตามไฟล์จริงของโปรเจกต์คุณ) --- */
const mounts = [
  
  // core
  { mountPoint: '/api/users',         relPath: './routes/userRoutes' },
  { mountPoint: '/api/branches',      relPath: './routes/branchRoutes' },
  { mountPoint: '/api/notifications', relPath: './routes/notificationRoutes' },

  // admin / nori
  { mountPoint: '/api/admin',         relPath: './routes/userRoleActions' },
  { mountPoint: '/api/branchAdmin',   relPath: './routes/branchAdminActions' },
  { mountPoint: '/api/report',        relPath: './routes/report' },
  { mountPoint: '/api/stat',          relPath: './routes/statistics' },

  // optional notify route (only if file exists)
  { mountPoint: '/api/notify',        relPath: './routes/notify' },

  // staff (subroutes)
  { mountPoint: '/api/staff',         relPath: './staff/petmanage' },
  { mountPoint: '/api/staff',         relPath: './staff/treatmentManage' },
  { mountPoint: '/api/staff/vaccinations', relPath: './staff/vaccinationManage' },
  { mountPoint: '/api/staff/schedules',     relPath: './staff/scheduleManage' },
  { mountPoint: '/api/staff-admin',  relPath: './staff/clinicStaffManage' },

  // OwnerPet
  { mountPoint: '/api/pets', relPath: './routes/OwnerPets' },

  // Owner Appointments 
{ mountPoint: '/api/owner/appointments', relPath: './routes/ownerAppointments' },
  
];



/* Mount safely: require each file, verify export is router-like, then app.use */
for (const m of mounts) {
  const r = safeRequire(m.relPath);
  if (!r.ok) {
    console.error(`❌ require failed for ${m.relPath}:`, r.error && r.error.message ? r.error.message : r.error);
    // fail-fast so you see exact problem on startup
    throw r.error;
  }
  const router = r.mod;
  if (!isRouterLike(router)) {
    console.error(`❌ Module ${m.relPath} is NOT an Express router/middleware.`);
    console.error('Exported value (preview):', router && Object.keys ? Object.keys(router).slice(0,6) : router);
    throw new Error(`Module ${m.relPath} must export an Express router (module.exports = router).`);
  }
  console.log(`→ Mounting ${m.relPath} at ${m.mountPoint}`);
  app.use(m.mountPoint, router);
}

/* --- 404 handler --- */
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

/* --- centralized error handler --- */
app.use((err, _req, res, _next) => {
  console.error('🔥 Unhandled error:', err && err.stack ? err.stack : err);
  res.status(err && err.status ? err.status : 500).json({ error: err && err.message ? err.message : 'Server error' });
});

/* --- Start server --- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server + Socket.IO running on :${PORT}`));

/* --- Optional graceful shutdown --- */
process.on('SIGINT', () => {
  console.log('SIGINT — shutting down');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('SIGTERM — shutting down');
  server.close(() => process.exit(0));
});
