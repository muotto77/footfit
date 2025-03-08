/**
 * Supabase Client สำหรับ FootFit Video Processor
 * 
 * ไฟล์นี้ใช้สำหรับเชื่อมต่อกับ Supabase API ในระบบ Video Processor
 * โดยจะทำหน้าที่เป็น SDK กลางในการติดต่อกับ Supabase จากเซิร์ฟเวอร์
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// โหลดค่าจากไฟล์ .env
dotenv.config();

// ตรวจสอบว่ามีค่า URL และ Key หรือไม่
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_KEY ในไฟล์ .env');
  process.exit(1);
}

// สร้าง Supabase client ด้วย service key (มีสิทธิ์เข้าถึงมากกว่า anon key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * ตรวจสอบการยืนยันตัวตนของผู้ใช้
 * @param {string} token - JWT token จาก Supabase Auth
 * @returns {Promise<Object|null>} ข้อมูลผู้ใช้หรือ null ถ้าไม่ถูกต้อง
 */
async function validateUserToken(token) {
  try {
    // ใช้ API ของ Supabase ในการตรวจสอบ token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Token ไม่ถูกต้อง:', error.message);
      return null;
    }
    
    return user;
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการตรวจสอบ token:', err);
    return null;
  }
}

/**
 * บันทึกข้อมูลวิดีโอลงในฐานข้อมูล
 * @param {Object} videoData - ข้อมูลวิดีโอที่ต้องการบันทึก
 * @returns {Promise<Object>} ผลลัพธ์การบันทึกข้อมูล
 */
async function saveVideoData(videoData) {
  const { data, error } = await supabase
    .from('videos')
    .insert(videoData)
    .select();
  
  if (error) {
    console.error('บันทึกข้อมูลวิดีโอไม่สำเร็จ:', error);
    throw error;
  }
  
  return data;
}

/**
 * อัพเดทข้อมูลวิดีโอในฐานข้อมูล
 * @param {string} videoId - ID ของวิดีโอที่ต้องการอัพเดท
 * @param {Object} updateData - ข้อมูลที่ต้องการอัพเดท
 * @returns {Promise<Object>} ผลลัพธ์การอัพเดทข้อมูล
 */
async function updateVideoData(videoId, updateData) {
  const { data, error } = await supabase
    .from('videos')
    .update(updateData)
    .eq('id', videoId)
    .select();
  
  if (error) {
    console.error('อัพเดทข้อมูลวิดีโอไม่สำเร็จ:', error);
    throw error;
  }
  
  return data;
}

/**
 * ดึงข้อมูลโปรไฟล์ของผู้ใช้
 * @param {string} userId - ID ของผู้ใช้
 * @returns {Promise<Object|null>} ข้อมูลโปรไฟล์หรือ null ถ้าไม่พบ
 */
async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('ดึงข้อมูลโปรไฟล์ไม่สำเร็จ:', error);
    return null;
  }
  
  return data;
}

/**
 * อัพเดทค่าพลังของผู้เล่น
 * @param {string} userId - ID ของผู้ใช้
 * @param {Object} powerStats - ค่าพลังที่ต้องการอัพเดท 
 * @returns {Promise<Object>} ผลลัพธ์การอัพเดทข้อมูล
 */
async function updatePlayerPower(userId, powerStats) {
  const { data, error } = await supabase
    .from('profiles')
    .update(powerStats)
    .eq('id', userId)
    .select();
  
  if (error) {
    console.error('อัพเดทค่าพลังไม่สำเร็จ:', error);
    throw error;
  }
  
  return data;
}

/**
 * ลงทะเบียนการดูวิดีโอ
 * @param {string} videoId - ID ของวิดีโอ
 * @param {string} viewerId - ID ของผู้ชม
 * @returns {Promise<Object>} ผลลัพธ์การบันทึกข้อมูล
 */
async function recordVideoView(videoId, viewerId) {
  const { data, error } = await supabase
    .from('video_views')
    .insert({
      video_id: videoId,
      viewer_id: viewerId,
      viewed_at: new Date().toISOString()
    })
    .select();
  
  if (error) {
    // ถ้าเป็น unique constraint error ให้ถือว่าเคยดูแล้ว ไม่ใช่ error
    if (error.code === '23505') {
      return { already_viewed: true };
    }
    console.error('บันทึกการดูวิดีโอไม่สำเร็จ:', error);
    throw error;
  }
  
  // อัพเดทจำนวนการดูในตาราง videos
  await supabase.rpc('increment_video_views', { vid: videoId });
  
  return data;
}

/**
 * เพิ่มการกดไลค์วิดีโอ
 * @param {string} videoId - ID ของวิดีโอ
 * @param {string} userId - ID ของผู้กดไลค์
 * @returns {Promise<Object>} ผลลัพธ์การบันทึกข้อมูล
 */
async function likeVideo(videoId, userId) {
  const { data, error } = await supabase
    .from('video_likes')
    .insert({
      video_id: videoId,
      user_id: userId,
      created_at: new Date().toISOString()
    })
    .select();
  
  if (error) {
    // ถ้าเป็น unique constraint error ให้ถือว่าเคยไลค์แล้ว ไม่ใช่ error
    if (error.code === '23505') {
      return { already_liked: true };
    }
    console.error('บันทึกการไลค์วิดีโอไม่สำเร็จ:', error);
    throw error;
  }
  
  // อัพเดทจำนวนไลค์ในตาราง videos
  await supabase.rpc('increment_video_likes', { vid: videoId });
  
  // อัพเดทค่าพลังของเจ้าของวิดีโอ (ได้รับพอยท์จากการถูกไลค์)
  const { data: videoData } = await supabase
    .from('videos')
    .select('user_id, video_type')
    .eq('id', videoId)
    .single();
  
  if (videoData) {
    // อัพเดทค่าพลังตามประเภทวิดีโอ
    const powerField = getPowerFieldByVideoType(videoData.video_type);
    if (powerField) {
      await supabase.rpc('increment_player_power', { 
        uid: videoData.user_id, 
        power_field: powerField,
        power_value: 1
      });
    }
  }
  
  return data;
}

/**
 * ยกเลิกการกดไลค์วิดีโอ
 * @param {string} videoId - ID ของวิดีโอ
 * @param {string} userId - ID ของผู้กดไลค์
 * @returns {Promise<boolean>} ผลลัพธ์การลบข้อมูล
 */
async function unlikeVideo(videoId, userId) {
  const { error } = await supabase
    .from('video_likes')
    .delete()
    .match({ video_id: videoId, user_id: userId });
  
  if (error) {
    console.error('ยกเลิกการไลค์วิดีโอไม่สำเร็จ:', error);
    throw error;
  }
  
  // ลดจำนวนไลค์ในตาราง videos
  await supabase.rpc('decrement_video_likes', { vid: videoId });
  
  // ลดค่าพลังของเจ้าของวิดีโอ
  const { data: videoData } = await supabase
    .from('videos')
    .select('user_id, video_type')
    .eq('id', videoId)
    .single();
  
  if (videoData) {
    // ลดค่าพลังตามประเภทวิดีโอ
    const powerField = getPowerFieldByVideoType(videoData.video_type);
    if (powerField) {
      await supabase.rpc('decrement_player_power', { 
        uid: videoData.user_id, 
        power_field: powerField,
        power_value: 1
      });
    }
  }
  
  return true;
}

/**
 * ฟังก์ชันช่วย - แปลงประเภทวิดีโอเป็นฟิลด์ค่าพลัง
 * @param {string} videoType - ประเภทของวิดีโอ
 * @returns {string|null} - ชื่อฟิลด์ค่าพลังที่ต้องอัพเดท
 */
function getPowerFieldByVideoType(videoType) {
  const typeToField = {
    'shooting': 'shooting_power',
    'dribbling': 'dribbling_power',
    'passing': 'passing_power',
    'physical': 'physical_power',
    'defense': 'defense_power',
    'speed': 'speed_power'
  };
  
  return typeToField[videoType] || null;
}

module.exports = {
  supabase,
  validateUserToken,
  saveVideoData,
  updateVideoData,
  getUserProfile,
  updatePlayerPower,
  recordVideoView,
  likeVideo,
  unlikeVideo
}; 