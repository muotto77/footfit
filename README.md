# FootFit Docker Setup

## ภาพรวม

โปรเจคนี้คือการติดตั้ง FootFit แพลตฟอร์มฟุตบอลโซเชียล โดยใช้ Docker เพื่อให้ง่ายต่อการติดตั้งและบำรุงรักษา โครงสร้างได้รับการออปติไมซ์สำหรับเซิร์ฟเวอร์ Xeon E5 2690v.1 RAM 32GB

## ความต้องการของระบบ

- CPU: Xeon E5 2690v.1 หรือเทียบเท่า (8 คอร์ 16 เธรด)
- RAM: 32GB เป็นอย่างน้อย
- พื้นที่จัดเก็บข้อมูล: SSD 250GB+
- ระบบปฏิบัติการ: Ubuntu Server 22.04 LTS แนะนำ
- Docker และ Docker Compose

## โครงสร้างโปรเจค

```
footfit/
├── backend/                   # Backend API (Node.js)
│   ├── Dockerfile             # คำสั่งสร้าง image สำหรับ backend
│   └── .env                   # ตัวแปรสภาพแวดล้อม
├── video-processor/           # บริการประมวลผลวิดีโอ
│   ├── Dockerfile             # คำสั่งสร้าง image สำหรับ video-processor
│   └── .env                   # ตัวแปรสภาพแวดล้อม
├── postgres/                  # PostgreSQL
│   └── init/                  # สคริปต์เริ่มต้นสำหรับ PostgreSQL
│       └── optimize.sql       # ตั้งค่า PostgreSQL เพื่อประสิทธิภาพสูงสุด
├── redis/                     # Redis Cache
│   └── data/                  # พื้นที่จัดเก็บข้อมูล Redis
├── minio/                     # MinIO Object Storage
│   ├── data/                  # พื้นที่จัดเก็บข้อมูล MinIO
│   └── scripts/               # สคริปต์สำหรับ MinIO
├── nginx/                     # Nginx Web Server
│   ├── conf.d/                # ไฟล์การตั้งค่า Nginx
│   ├── data/                  # ไฟล์ static สำหรับเว็บ
│   ├── logs/                  # บันทึกการทำงาน
│   └── ssl/                   # ใบรับรอง SSL
├── prometheus/                # Prometheus Monitoring
│   └── prometheus.yml         # ไฟล์การตั้งค่า Prometheus
├── grafana/                   # Grafana Dashboard
│   ├── data/                  # พื้นที่จัดเก็บข้อมูล Grafana
│   └── provisioning/          # การตั้งค่าล่วงหน้า
├── temp-videos/               # พื้นที่จัดเก็บวิดีโอชั่วคราว
├── docker-compose.yml         # ไฟล์การตั้งค่า Docker Compose
├── backup-footfit.sh          # สคริปต์สำรองข้อมูล
└── README.md                  # ไฟล์นี้
```

## ขั้นตอนการติดตั้ง

1. ติดตั้ง Docker และ Docker Compose

```bash
# อัปเดตแพ็คเกจ
sudo apt update && sudo apt upgrade -y

# ติดตั้งเครื่องมือพื้นฐาน
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git htop net-tools

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

2. ตั้งค่า Swap (สำหรับระบบที่มี RAM น้อยกว่า 32GB)

```bash
# สร้างไฟล์ Swap ขนาด 16GB
sudo fallocate -l 16G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# ตั้งค่าให้ใช้ Swap ถาวร
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# ตั้งค่า swappiness ให้เหมาะสม (ใช้ RAM ก่อน swap)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

3. โคลนโปรเจคและติดตั้ง

```bash
# โคลนโปรเจค (หรือสร้างไฟล์เอง)
git clone https://github.com/yourusername/footfit.git
cd footfit

# สร้างไดเรกทอรีที่จำเป็น (ถ้ายังไม่มี)
mkdir -p ./backend ./video-processor ./postgres/init ./redis/data ./minio/{data,scripts} ./nginx/{conf.d,data,logs,ssl} ./prometheus ./grafana/{data,provisioning} ./temp-videos
```

4. ปรับแต่งการตั้งค่า

```bash
# ปรับแต่งไฟล์ .env
nano ./backend/.env
nano ./video-processor/.env

# แก้ไขรหัสผ่านใน docker-compose.yml
nano docker-compose.yml
```

5. เริ่มระบบ

```bash
# เริ่มต้นบริการทั้งหมด
docker-compose up -d

# ตรวจสอบสถานะ
docker-compose ps

# ดูบันทึกการทำงาน
docker-compose logs -f
```

## การใช้งานพื้นฐาน

### เริ่มต้น/หยุดระบบ

```bash
# เริ่มต้นบริการทั้งหมด
docker-compose up -d

# หยุดบริการทั้งหมด
docker-compose down

# รีสตาร์ทบริการทั้งหมด
docker-compose restart

# รีสตาร์ทบริการเฉพาะ
docker-compose restart backend
```

### ตรวจสอบสถานะ

```bash
# ตรวจสอบสถานะบริการ
docker-compose ps

# ตรวจสอบการใช้ทรัพยากร
docker stats

# ดูบันทึกการทำงาน
docker-compose logs -f
docker-compose logs backend
```

### การสำรองข้อมูล

```bash
# เรียกใช้สคริปต์สำรองข้อมูล
./backup-footfit.sh

# ตั้งค่า cron เพื่อสำรองข้อมูลอัตโนมัติ (ทุกวันเวลา 03:00 น.)
crontab -e
```

เพิ่มบรรทัดนี้:
```
0 3 * * * /path/to/footfit/backup-footfit.sh
```

## การเข้าถึง

- Backend API: http://your-server-ip/api
- MinIO Console: http://your-server-ip/minio-console
- Prometheus: http://your-server-ip/prometheus
- Grafana: http://your-server-ip/grafana (admin/footfit_admin)

## การแก้ไขปัญหาเบื้องต้น

### คอนเทนเนอร์ไม่เริ่มต้นหรือขัดข้อง

```bash
# ตรวจสอบบันทึกการทำงาน
docker-compose logs service_name

# รีสตาร์ทคอนเทนเนอร์
docker-compose restart service_name

# เข้าถึง shell ภายในคอนเทนเนอร์
docker exec -it footfit-backend /bin/sh
```

### ปัญหาหน่วยความจำสูง

```bash
# ตรวจสอบการใช้หน่วยความจำ
free -h
docker stats

# ลดการใช้หน่วยความจำโดยปรับแต่ง docker-compose.yml
nano docker-compose.yml
```

### ปัญหาการเข้าถึง MinIO

```bash
# ตรวจสอบการเข้าถึง MinIO
docker exec -it footfit-minio /bin/sh
mc config host add myminio http://localhost:9000 your_minio_access_key your_minio_secret_key
mc ls myminio
```

## ติดต่อสอบถาม

หากมีคำถามหรือต้องการความช่วยเหลือเพิ่มเติม โปรดติดต่อทีมพัฒนา FootFit 