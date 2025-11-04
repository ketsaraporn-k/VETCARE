// npm install multer for upload image
/* server.js */
const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db');

//uploadspic
const path = require('path'); // เพิ่มเพื่อจัดการ path ได้ถูกต้อง


const app = express();
/* app.use(cors()); */
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

//  เพิ่มเพื่อเสิร์ฟไฟล์ static (เช่น avatar หรือรูปอื่น ๆ)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//  ถ้ามีโฟลเดอร์ชื่ออื่น เช่น uploadspic ให้เปิดเพิ่มได้ เช่น
// app.use('/uploadspic', express.static(path.join(__dirname, 'uploadspic')));

//  Import routes
const userRoutes = require('./routes/userRoutes');
const branchRoutes = require('./routes/branchRoutes');
const vaccinationRoutes = require('./routes/vaccinationRoutes');
const treatmentRoutes = require('./routes/treatmentRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

//  ใช้งาน routes
//uploadspic
/* app.use("/uploads", express.static("uploads")); */
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/vaccinations', vaccinationRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/notifications', notificationRoutes);



//Nori pop up (socket)
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });

// inject io to requests (ให้ controllers/route ใช้งานได้ผ่าน req.io)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Nori API routes (อยู่หลังการ inject io)
const branchAdminActions = require('./routes/branchAdminActions');
const userRoleActions = require('./routes/userRoleActions');
const reportRoutes = require('./routes/report');
const statRoutes = require('./routes/statistics');
const notifyRoutes = require('./routes/notify');



// NOTE: เปลี่ยน mount เป็น /api/branchAdmin ให้ตรงกับชื่อไฟล์
app.use('/api/admin', userRoleActions);
app.use('/api/branchAdmin', branchAdminActions);
app.use('/api/report', reportRoutes);
app.use('/api/stat', statRoutes);
app.use('/api/notify', notifyRoutes);

//staff j
const petManageRoutes = require('./staff/petmanage');
const treatmentManageRoutes = require('./staff/treatmentManage');
const vaccinationManageRoutes = require('./staff/vaccinationManage');
const scheduleManageRoutes = require('./staff/scheduleManage');
const clinicStaffManageRoutes = require('./staff/clinicStaffManage');
//staff j
app.use('/api/staff', petManageRoutes);
app.use('/api/staff', treatmentManageRoutes);
app.use('/api/staff/vaccinations', vaccinationManageRoutes); 
app.use('/api/staff/schedules', scheduleManageRoutes);
app.use('/api/staff-admin', clinicStaffManageRoutes);




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
