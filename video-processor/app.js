// app.js - ไฟล์หลักสำหรับ video-processor ที่ใช้งานร่วมกับ Supabase

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const cors = require('cors');
const { 
  supabase, 
  validateUserToken, 
  saveVideoData, 
  updateVideoData 
} = require('./supabase');

// โหลดตัวแปรสภาพแวดล้อม
require('dotenv').config();

// ตั้งค่า FFmpeg
ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || '/usr/bin/ffmpeg');
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || '/usr/bin/ffprobe');

// ตั้งค่า Minio
const Minio = require('minio');
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'footfit-minio',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

// ตั้งค่า Express
const app = express();
app.use(express.json());
app.use(cors());

// ตั้งค่า Multer สำหรับการอัปโหลดไฟล์
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = process.env.TEMP_DIR || '/app/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const videoFileFilter = (req, file, cb) => {
  // ตรวจสอบประเภทไฟล์
  const allowedTypes = (process.env.VIDEO_FORMATS || 'mp4,mov,avi,wmv,flv,mkv').split(',');
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`ไม่รองรับไฟล์ประเภท .${ext} กรุณาใช้ไฟล์ประเภท: ${allowedTypes.join(', ')}`), false);
  }
};

const maxSize = parseInt(process.env.MAX_VIDEO_SIZE_MB || '50') * 1024 * 1024; // แปลงเป็น bytes

const upload = multer({
  storage: storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: maxSize
  }
});

// ตรวจสอบว่า bucket ที่ต้องการมีอยู่หรือไม่ และสร้างหากยังไม่มี
async function ensureBucketExists(bucketName) {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName);
      console.log(`สร้าง bucket ${bucketName} สำเร็จ`);
    }
  } catch (err) {
    console.error(`ไม่สามารถตรวจสอบหรือสร้าง bucket ${bucketName}:`, err);
  }
}

// ทดสอบการเชื่อมต่อกับ MinIO และ Supabase เมื่อเริ่มต้นแอป
async function testConnections() {
  try {
    // ทดสอบการเชื่อมต่อกับ MinIO
    const videoBucket = process.env.MINIO_BUCKET_NAME || 'videos';
    
    await ensureBucketExists(videoBucket);
    
    console.log('✅ เชื่อมต่อกับ MinIO สำเร็จ');
    
    // ทดสอบการเชื่อมต่อกับ Supabase
    const { data, error } = await supabase.from('videos').select('id').limit(1);
    
    if (error) {
      console.error('❌ เชื่อมต่อกับ Supabase ล้มเหลว:', error.message);
    } else {
      console.log('✅ เชื่อมต่อกับ Supabase สำเร็จ');
    }
  } catch (err) {
    console.error('❌ ทดสอบการเชื่อมต่อล้มเหลว:', err);
  }
}

// ดึงข้อมูลวิดีโอ (ความยาว, ความละเอียด, ฯลฯ)
async function getVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('ไม่พบข้อมูลวิดีโอ'));
      }
      
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width,
        height: videoStream.height,
        format: metadata.format.format_name,
        size: metadata.format.size,
        bit_rate: metadata.format.bit_rate
      });
    });
  });
}

// สร้าง thumbnail จากวิดีโอ
async function createThumbnail(videoPath, userId) {
  const thumbnailDir = process.env.TEMP_DIR || '/app/temp';
  const thumbnailPath = path.join(thumbnailDir, `${path.basename(videoPath, path.extname(videoPath))}_thumb.jpg`);
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        count: 1,
        filename: path.basename(thumbnailPath),
        folder: thumbnailDir,
        size: process.env.THUMBNAIL_SIZE || '320x180',
        quality: parseInt(process.env.THUMBNAIL_QUALITY || '80')
      })
      .on('end', () => resolve(thumbnailPath))
      .on('error', (err) => reject(err));
  });
}

// ประมวลผลวิดีโอ (ปรับขนาด, คุณภาพ)
async function processVideo(inputPath, userId) {
  const outputDir = process.env.TEMP_DIR || '/app/temp';
  const outputFileName = `${path.basename(inputPath, path.extname(inputPath))}_processed.mp4`;
  const outputPath = path.join(outputDir, outputFileName);
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .output(outputPath)
      .size(process.env.VIDEO_RESOLUTION === '720p' ? '1280x720' : '640x360')
      .videoBitrate(process.env.VIDEO_BITRATE || '1500k')
      .format(process.env.VIDEO_OUTPUT_FORMAT || 'mp4')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .run();
  });
}

// อัปโหลดไฟล์ไปยัง MinIO
async function uploadToMinio(filePath, fileName, contentType) {
  const bucket = process.env.MINIO_BUCKET_NAME || 'videos';
  
  try {
    await minioClient.fPutObject(bucket, fileName, filePath, {
      'Content-Type': contentType
    });
    
    // สร้าง URL ที่สามารถเข้าถึงได้
    // รอ Nginx ในการทำ proxy มายัง MinIO
    const minioBaseUrl = '/minio';
    const fileUrl = `${minioBaseUrl}/${bucket}/${fileName}`;
    return fileUrl;
  } catch (err) {
    console.error('ไม่สามารถอัปโหลดไฟล์ไปยัง MinIO:', err);
    throw err;
  }
}

// ลบไฟล์ชั่วคราว
async function cleanupTempFiles(files) {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (err) {
      console.error(`ไม่สามารถลบไฟล์ ${file}:`, err);
    }
  }
}

// สร้าง API endpoint สำหรับการอัปโหลดวิดีโอ
app.post('/api/videos/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ไม่พบไฟล์วิดีโอในคำขอ' });
  }

  // ตรวจสอบ token Supabase
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'ต้องการการยืนยันตัวตน' });
  }

  try {
    const token = authHeader.split(' ')[1];
    
    // ตรวจสอบสิทธิ์ของผู้ใช้
    const user = await validateUserToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'ไม่มีสิทธิ์ในการอัปโหลด' });
    }
    
    const userId = user.id;
    const videoPath = req.file.path;
    
    // ตรวจสอบข้อมูลวิดีโอ
    const metadata = await getVideoMetadata(videoPath);
    
    // ตรวจสอบความยาววิดีโอ
    const maxDuration = parseInt(process.env.MAX_VIDEO_DURATION_SEC || '60');
    if (metadata.duration > maxDuration) {
      await cleanupTempFiles([videoPath]);
      return res.status(400).json({ 
        error: `วิดีโอยาวเกินไป ต้องไม่เกิน ${maxDuration} วินาที` 
      });
    }
    
    // ประมวลผลวิดีโอ
    const processedVideoPath = await processVideo(videoPath, userId);
    
    // สร้าง thumbnail
    const thumbnailPath = await createThumbnail(processedVideoPath, userId);
    
    // กำหนดชื่อไฟล์
    const videoType = req.body.videoType || 'general';
    const videoFileName = `${userId}/${videoType}_${Date.now()}.mp4`;
    const thumbnailFileName = `${userId}/${videoType}_${Date.now()}_thumb.jpg`;
    
    // อัปโหลดไฟล์ไปยัง MinIO
    const videoUrl = await uploadToMinio(processedVideoPath, videoFileName, 'video/mp4');
    const thumbnailUrl = await uploadToMinio(thumbnailPath, thumbnailFileName, 'image/jpeg');
    
    // บันทึกข้อมูลวิดีโอลงใน Supabase
    const videoData = {
      user_id: userId,
      title: req.body.title || 'วิดีโอไม่มีชื่อ',
      description: req.body.description || '',
      video_type: videoType,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      duration: Math.round(metadata.duration),
      width: metadata.width,
      height: metadata.height,
      status: 'active',
      views: 0,
      likes: 0
    };
    
    const savedVideo = await saveVideoData(videoData);
    
    // ลบไฟล์ชั่วคราว
    await cleanupTempFiles([videoPath, processedVideoPath, thumbnailPath]);
    
    res.status(201).json({
      success: true,
      video: savedVideo[0]
    });
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการอัปโหลดวิดีโอ:', error);
    res.status(500).json({ error: error.message });
  }
});

// สร้าง API endpoint สำหรับการดึงข้อมูลวิดีโอ
app.get('/api/videos/:videoId', async (req, res) => {
  const { videoId } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        profiles:user_id (id, username, display_name, avatar_url)
      `)
      .eq('id', videoId)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ error: 'ไม่พบวิดีโอ' });
    }
    
    // อัพเดทจำนวนการดู
    await supabase.rpc('increment_video_views', { vid: videoId });
    
    res.json(data);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลวิดีโอ:', error);
    res.status(500).json({ error: error.message });
  }
});

// สร้าง API endpoint สำหรับตรวจสอบสถานะเซิร์ฟเวอร์
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// เริ่มต้นเซิร์ฟเวอร์
const PORT = process.env.SERVER_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 FootFit Video Processor API กำลังทำงานที่ http://${HOST}:${PORT}`);
  testConnections();
}); 