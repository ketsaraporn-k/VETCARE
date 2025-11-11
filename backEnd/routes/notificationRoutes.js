// backEnd/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const controller = require('../controllers/notificationController');

// protected: get current user's notifications
router.get('/', auth, controller.getNotifications);

// protected: mark read
router.put('/:id/read', auth, controller.markRead);

module.exports = router;
