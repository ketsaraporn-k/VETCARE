// backEnd/routes/notify.js
const express = require('express');
const router = express.Router();
const { createNotification } = require('../utils/notify');
const auth = require('../middleware/auth'); // ถ้าต้องการให้ auth

// POST /api/notify   -> body: { userId or userIds, payload }
router.post('/', auth, async (req, res) => {
  try {
    const { userOrIds, payload } = req.body;
    if (!userOrIds) return res.status(422).json({ error: 'userOrIds required' });

    const result = await createNotification(userOrIds, payload || {});
    return res.status(201).json({ result });
  } catch (err) {
    console.error('notify create err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// optional: GET /api/notify/test to check util
router.get('/test', (req, res) => res.json({ ok: true }));

module.exports = router;
