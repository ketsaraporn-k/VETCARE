const express = require('express');
const router = express.Router();
const Branch = require('../../models/Branch');

// GET สาขาทั้งหมด
router.get('/', async (req, res) => {
  try {
    const branches = await Branch.find();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST เพิ่มสาขาใหม่
router.post('/', async (req, res) => {
  try {
    const { branchName, address, phone, managerId } = req.body;
    const branch = new Branch({ branchName, address, phone, managerId });
    await branch.save();
    res.json({ message: 'Branch created', branch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE ลบสาขา
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Branch.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Branch not found' });
    res.json({ message: 'Branch deleted', deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
