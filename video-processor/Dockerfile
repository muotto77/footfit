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
COPY ../supabase.js ./supabase.js

# สร้างไดเรกทอรีสำหรับประมวลผลวิดีโอชั่วคราวและบันทึก
RUN mkdir -p /app/temp
RUN mkdir -p /app/logs

# ตั้งค่าสภาพแวดล้อม Node.js
ENV NODE_OPTIONS="--max-old-space-size=2048"
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# เปิดพอร์ท
EXPOSE 3001

# เริ่มต้นแอปพลิเคชัน
CMD ["node", "app.js"] 