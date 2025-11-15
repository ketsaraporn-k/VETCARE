//backEnd/routes/treatmentRoutes.js
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const role = require('../middleware/role');
const controller = require('../controllers/treatmentController');

// POST /users/:userId/pets/:petId/treatments  (controller expects userId/petId)
router.post('/users/:userId/pets/:petId/treatments', auth, role(['staff','branchAdmin']), controller.addTreatment);
router.get('/branch/:branchId', auth, controller.getByBranch);

// Get treatments by branch
router.get('/branch/:branchId', auth, controller.getByBranch);


module.exports = router;
