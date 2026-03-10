//multerConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const { folderId } = req.params;
        
        console.log('🔍 Multer destination:', { 
            folderId, 
            originalname: file.originalname 
        });
        
        // ✅ Upload ไปที่ folder หลักก่อน (ไม่สร้าง subfolder ที่นี่)
        const uploadDir = path.join(__dirname, '..', 'Uploads', `folder_${folderId}`);
        
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            await fs.chmod(uploadDir, 0o755);
            console.log('✅ Directory created/verified:', uploadDir);
            cb(null, uploadDir);
        } catch (error) {
            console.error(`❌ Error creating upload directory:`, error.message);
            cb(error);
        }
    },
    
    filename: (req, file, cb) => {
        // ✅ ใช้ timestamp + original name
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        const decodedName = Buffer.from(nameWithoutExt, 'latin1').toString('utf8');
        const filename = `${timestamp}-${decodedName}${ext}`;
        
        console.log('📄 Generated filename:', filename);
        cb(null, filename);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const forbiddenExtensions = [
            '.exe', '.bat', '.cmd', '.msi', '.vbs', '.js', '.jar', '.ps1', '.scr',
            '.com', '.pif', '.vb', '.vbe', '.ws', '.wsf', '.wsh', '.sh', '.bash'
        ];
        const forbiddenMimeTypes = [
            'application/x-msdownload',
            'application/x-bat',
            'application/x-msi',
            'application/x-javascript',
            'application/java-archive',
            'text/x-script',
            'application/x-sh'
        ];
        
        if (forbiddenExtensions.includes(fileExtension) || forbiddenMimeTypes.includes(file.mimetype)) {
            console.log(`❌ Rejected file: ${file.originalname} (${file.mimetype})`);
            cb(new Error('ไม่สามารถอัพโหลดไฟล์ประเภทนี้ได้ เนื่องจากอาจเป็นอันตราย'));
        } else {
            cb(null, true);
        }
    },
    limits: {
        fileSize: 400 * 1024 * 1024 // 400MB
    }
});

module.exports = upload;