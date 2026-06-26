const fs = require('node:fs/promises');
const multer = require('multer');
const db = require('../queries/storage');
const { randomUUID } = require('crypto');

const multerStorage = multer.diskStorage({
    destination: async function destination(req, file, cb) {
        const path = `./uploads/${req.user.username}`;
        await fs.mkdir(path, { recursive: true });
        cb(null, path)
    },
    filename: function filename(req, file, cb) {
        const fileName = randomUUID();
        cb(null, fileName)
    }
})

const multerFileFilter = async (req, file, cb) => {
    const currentFolder = await db.getFolder(req.body.currentFolder);
    const maxLength = 200;
    if (file.originalname.length > 200 && file.originalname.length <= 0) {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'File name length must be between 1 and 200.'), false); 
    } else if (!currentFolder.accept_file) {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Cannot upload files in this folder.'), false); 
    } else {
        cb(null, true);
    }
  }

const upload = multer({ 
    storage: multerStorage,
    fileFilter: multerFileFilter
 });

module.exports = upload