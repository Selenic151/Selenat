const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  addMember,
  removeMember,
  deleteRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getRooms)
  .post(protect, createRoom);

router.route('/:id')
  .get(protect, getRoomById)
  .put(protect, updateRoom)
  .delete(protect, deleteRoom);

router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);

module.exports = router;