/* server.js */
const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db');

const app = express();
/* app.use(cors()); */
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// ✅ Import routes
const userRoutes = require('./routes/userRoutes');
const branchRoutes = require('./routes/branchRoutes');
const petRoutes = require('./routes/petRoutes');
const vaccinationRoutes = require('./routes/vaccinationRoutes');
const treatmentRoutes = require('./routes/treatmentRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// ✅ ใช้งาน routes
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/vaccinations', vaccinationRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/notifications', notificationRoutes);


//Nori
const branch = require('./routes/noriApi/branch');
const reportRoutes = require('./routes/noriApi/report');
const statRoutes = require('./routes/noriApi/statistics');
const notifyRoutes = require('./routes/noriApi/notify');

//Nori pop up
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' }});

// inject io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// routes Nori
app.use('/api/branches2', branch);
app.use('/api/report', reportRoutes);
app.use('/api/stat', statRoutes);
app.use('/api/notify', notifyRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
