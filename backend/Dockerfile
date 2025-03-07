FROM node:18-alpine

# ติดตั้ง ffmpeg และเครื่องมือที่จำเป็น
RUN apk add --no-cache ffmpeg tzdata curl

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

# ตั้งค่าสภาพแวดล้อม Node.js ให้เหมาะสมกับ CPU 8 คอร์ 16 เธรด RAM 32GB
ENV NODE_OPTIONS="--max-old-space-size=3072"
ENV NODE_ENV=production
ENV WEB_CONCURRENCY=8

# เปิดพอร์ท
EXPOSE 3000

# เริ่มต้นแอปพลิเคชัน
CMD ["node", "src/index.js"] 