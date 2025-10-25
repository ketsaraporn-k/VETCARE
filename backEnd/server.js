const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./db');

const app = express();
app.use(cors());
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
