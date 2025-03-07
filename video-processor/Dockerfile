FROM node:18-alpine

# ติดตั้ง FFmpeg และเครื่องมือที่จำเป็น
RUN apk add --no-cache ffmpeg ffmpeg-dev tzdata curl python3 make g++

# ตั้งค่าเวลาให้เป็นไทย
ENV TZ=Asia/Bangkok

# สร้างไดเรกทอรีแอปพลิเคชัน
WORKDIR /app

# คัดลอกเฉพาะไฟล์ package*.json ก่อน
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm ci --only=production

# คัดลอกโค้ดแอปพลิเคชัน
COPY . .

# สร้างไดเรกทอรีสำหรับประมวลผลวิดีโอชั่วคราว
RUN mkdir -p /tmp/videos

# ตั้งค่าสภาพแวดล้อม Node.js ให้เหมาะสมกับ CPU 8 คอร์ 16 เธรด RAM 32GB
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NODE_ENV=production
ENV WEB_CONCURRENCY=4
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# เปิดพอร์ท
EXPOSE 3001

# เริ่มต้นแอปพลิเคชัน
CMD ["node", "src/index.js"] 