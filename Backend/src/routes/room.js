const express = require('express');
const router = express.Router();
const {
  createRoom,
  getRooms,
  getRoomById,
  updateRoom,
  addMember,
  removeMember,
  deleteRoom,
  uploadRoomAvatar
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, '../../public/uploads/rooms'));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-'));
    }
  })
});

router.route('/')
  .get(protect, getRooms)
  .post(protect, createRoom);

router.route('/:id')
  .get(protect, getRoomById)
  .put(protect, updateRoom)
  .delete(protect, deleteRoom);

router.post('/:id/members', protect, addMember);
router.delete('/:id/members/:userId', protect, removeMember);
router.put('/:id/avatar', protect, upload.single('avatar'), uploadRoomAvatar);

module.exports = router;