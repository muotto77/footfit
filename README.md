# FootFit - แพลตฟอร์มฟุตบอลโซเชียลที่ใช้ Supabase

## ภาพรวม

โปรเจคนี้คือการติดตั้ง FootFit แพลตฟอร์มฟุตบอลโซเชียล โดยใช้ Supabase เป็นบริการหลักสำหรับฐานข้อมูลและการยืนยันตัวตน พร้อมกับใช้ Docker สำหรับบริการประมวลผลวิดีโอและจัดเก็บไฟล์ขนาดใหญ่

## สถาปัตยกรรมระบบ

FootFit ใช้สถาปัตยกรรมแบบผสมผสาน โดยใช้ Supabase สำหรับ:
- ฐานข้อมูลและ API หลัก (PostgreSQL)
- การยืนยันตัวตนและการจัดการผู้ใช้
- การเก็บข้อมูลขนาดเล็ก (เช่น ข้อมูลโปรไฟล์)

และใช้เซิร์ฟเวอร์ส่วนตัวสำหรับ:
- การจัดเก็บวิดีโอผ่าน MinIO
- การประมวลผลวิดีโอ (สร้าง thumbnail, ประมวลผลฯลฯ)

## ความต้องการของระบบ

- CPU: 4 คอร์ หรือมากกว่า
- RAM: 8GB เป็นอย่างน้อย
- พื้นที่จัดเก็บข้อมูล: SSD 50GB+
- ระบบปฏิบัติการ: Ubuntu Server 20.04+ หรือ Windows พร้อม WSL2
- Docker และ Docker Compose
- บัญชี Supabase (มีแพ็กเกจฟรีสำหรับเริ่มต้น)

## โครงสร้างโปรเจค

```
footfit/
├── video-processor/           # บริการประมวลผลวิดีโอ
│   ├── Dockerfile             # คำสั่งสร้าง image สำหรับ video-processor
│   ├── app.js                 # ไฟล์หลักของระบบประมวลผลวิดีโอ
│   ├── package.json           # dependencies และสคริปต์
│   └── .env                   # ตัวแปรสภาพแวดล้อม
├── minio/                     # MinIO Object Storage
│   └── data/                  # พื้นที่จัดเก็บข้อมูล MinIO
├── nginx/                     # Nginx Web Server
│   ├── conf.d/                # ไฟล์การตั้งค่า Nginx
│   ├── data/                  # ไฟล์ static สำหรับเว็บ
│   └── logs/                  # บันทึกการทำงาน
├── temp-videos/               # พื้นที่จัดเก็บวิดีโอชั่วคราว
├── docker-compose.yml         # ไฟล์การตั้งค่า Docker Compose
├── supabase.js                # ไฟล์เชื่อมต่อกับ Supabase
└── README.md                  # ไฟล์นี้
```

## ขั้นตอนการติดตั้ง

### 1. ตั้งค่า Supabase

1. สร้างบัญชีและโปรเจคใหม่ที่ [Supabase](https://app.supabase.com/)
2. ทำตามขั้นตอนการตั้งค่าและสร้างฐานข้อมูล:
   - สร้างตาราง `profiles`, `videos`, `teams`, `fields`, และอื่นๆ ตามที่กำหนด
   - ตั้งค่า Row Level Security (RLS) เพื่อความปลอดภัย
   - ตั้งค่าการยืนยันตัวตน (Authentication)
3. บันทึก Project URL และ API Keys สำหรับใช้ในขั้นตอนถัดไป

### 2. ติดตั้ง Docker และ Docker Compose

```bash
# อัปเดตแพ็คเกจ
sudo apt update && sudo apt upgrade -y

# ติดตั้งเครื่องมือพื้นฐาน
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git

# ติดตั้ง Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# เพิ่มผู้ใช้ปัจจุบันเข้ากลุ่ม docker
sudo usermod -aG docker ${USER}

# ติดตั้ง Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. โคลนโปรเจคและตั้งค่า

```bash
# โคลนโปรเจค (หรือดาวน์โหลดไฟล์ ZIP)
git clone https://github.com/yourusername/footfit.git
cd footfit

# แก้ไขไฟล์ .env สำหรับ video-processor
nano video-processor/.env

# แก้ไขไฟล์ docker-compose.yml
nano docker-compose.yml

# แก้ไขไฟล์ nginx/conf.d/default.conf
nano nginx/conf.d/default.conf
```

### 4. ปรับแต่งการตั้งค่า

- แก้ไขไฟล์ `.env` ในโฟลเดอร์ `video-processor`:
  - ใส่ `SUPABASE_URL` และ `SUPABASE_SERVICE_KEY` ของคุณ
  - ปรับค่า `MINIO_ACCESS_KEY` และ `MINIO_SECRET_KEY` ให้ตรงกับที่ระบุใน `docker-compose.yml`

- แก้ไขไฟล์ `docker-compose.yml`:
  - ปรับค่า `your_minio_access_key` และ `your_minio_secret_key` ให้เป็นรหัสผ่านที่ปลอดภัย
  - ใส่ `SUPABASE_URL` และ `SUPABASE_SERVICE_KEY` ของคุณ

- แก้ไขไฟล์ `nginx/conf.d/default.conf`:
  - แทนที่ `your-project-ref.supabase.co` ด้วย URL โปรเจค Supabase ของคุณ

### 5. เริ่มต้นระบบ

```bash
# สร้างไดเรกทอรีที่จำเป็น
mkdir -p minio/data nginx/data nginx/logs temp-videos

# เริ่มต้นบริการทั้งหมด
docker-compose up -d

# ตรวจสอบสถานะ
docker-compose ps

# ดูบันทึกการทำงาน
docker-compose logs -f
```

## การใช้งานพื้นฐาน

### เข้าถึงบริการต่างๆ

- หน้าหลัก: `http://<your-server-ip>/`
- MinIO Console: `http://<your-server-ip>/minio-console/`
- Supabase Dashboard: `https://app.supabase.com/project/<your-project-id>`
- Video Processor API: `http://<your-server-ip>/api/videos/upload`

### การอัปโหลดวิดีโอ

1. ผู้ใช้ล็อกอินผ่าน Supabase Authentication ในแอปพลิเคชัน
2. แอปพลิเคชันส่งวิดีโอไปยัง Video Processor API พร้อม token
3. Video Processor ตรวจสอบสิทธิ์ผ่าน Supabase, ประมวลผลวิดีโอ และอัปโหลดไปยัง MinIO
4. ข้อมูลวิดีโอถูกบันทึกใน Supabase พร้อม URL ที่ชี้ไปยังไฟล์ใน MinIO

### การจัดการฐานข้อมูล

จัดการฐานข้อมูลและ API ผ่าน Supabase Dashboard:
- สร้างและแก้ไขตาราง
- จัดการการยืนยันตัวตน
- ตั้งค่า Row Level Security
- สร้าง Edge Functions

## การแก้ไขปัญหาเบื้องต้น

### คอนเทนเนอร์ไม่เริ่มต้นหรือขัดข้อง

```bash
# ตรวจสอบบันทึกการทำงาน
docker-compose logs service_name

# รีสตาร์ทคอนเทนเนอร์
docker-compose restart service_name

# เข้าถึง shell ภายในคอนเทนเนอร์
docker exec -it footfit-video-processor /bin/sh
```

### ปัญหาเชื่อมต่อกับ Supabase

1. ตรวจสอบให้แน่ใจว่า `SUPABASE_URL` และ `SUPABASE_SERVICE_KEY` ถูกต้อง
2. ตรวจสอบการตั้งค่า CORS ใน Supabase Project Dashboard
3. ตรวจสอบว่า API ที่ใช้งานได้รับอนุญาตให้เข้าถึงหรือไม่

### ปัญหาการเข้าถึง MinIO

```bash
# ตรวจสอบการเข้าถึง MinIO
docker exec -it footfit-minio /bin/sh
mc config host add myminio http://localhost:9000 your_minio_access_key your_minio_secret_key
mc ls myminio
```

## การพัฒนาต่อยอด

### เพิ่มฟีเจอร์และ API ใหม่

1. สร้างตารางใหม่ใน Supabase
2. ตั้งค่า RLS สำหรับตารางนั้น
3. ใช้ Supabase JavaScript Client ในแอปพลิเคชันเพื่อเข้าถึงข้อมูล

### ปรับปรุงประสิทธิภาพวิดีโอ

1. แก้ไขไฟล์ `video-processor/app.js` เพื่อเพิ่มฟีเจอร์ประมวลผลวิดีโอ
2. เพิ่มการตั้งค่า FFmpeg เพื่อปรับแต่งคุณภาพและขนาดวิดีโอ

### เชื่อมต่อกับระบบอื่นๆ

1. เพิ่ม Edge Functions ใน Supabase เพื่อเชื่อมต่อกับบริการภายนอก
2. ใช้ Supabase Webhooks เพื่อแจ้งเตือนเมื่อมีการเปลี่ยนแปลงข้อมูล

## ผู้พัฒนา

- [ชื่อผู้พัฒนา] - [อีเมล]

## ลิขสิทธิ์

สงวนลิขสิทธิ์ © 2023 FootFit 