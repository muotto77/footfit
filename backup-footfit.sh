#!/bin/bash

# กำหนดตัวแปร
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_DIR="/backup"
MAX_DAYS=7

# สร้างไดเรกทอรีสำรองข้อมูล
mkdir -p $BACKUP_DIR/postgres
mkdir -p $BACKUP_DIR/minio
mkdir -p $BACKUP_DIR/redis

echo "เริ่มการสำรองข้อมูล FootFit วันที่ $(date)"

# สำรองข้อมูล PostgreSQL
echo "กำลังสำรองข้อมูล PostgreSQL..."
docker exec footfit-postgres pg_dump -U footfit footfit > $BACKUP_DIR/postgres/footfit_$TIMESTAMP.sql
if [ $? -eq 0 ]; then
    gzip $BACKUP_DIR/postgres/footfit_$TIMESTAMP.sql
    echo "สำรองข้อมูล PostgreSQL สำเร็จ: $BACKUP_DIR/postgres/footfit_$TIMESTAMP.sql.gz"
else
    echo "ไม่สามารถสำรองข้อมูล PostgreSQL"
    exit 1
fi

# สำรองข้อมูล MinIO
echo "กำลังสำรองข้อมูล MinIO..."
tar -czf $BACKUP_DIR/minio/minio_$TIMESTAMP.tar.gz ./footfit/minio/data
if [ $? -eq 0 ]; then
    echo "สำรองข้อมูล MinIO สำเร็จ: $BACKUP_DIR/minio/minio_$TIMESTAMP.tar.gz"
else
    echo "ไม่สามารถสำรองข้อมูล MinIO"
    exit 1
fi

# สำรองข้อมูล Redis (RDB)
echo "กำลังสำรองข้อมูล Redis..."
docker exec footfit-redis redis-cli SAVE
cp ./footfit/redis/data/dump.rdb $BACKUP_DIR/redis/redis_$TIMESTAMP.rdb
if [ $? -eq 0 ]; then
    echo "สำรองข้อมูล Redis สำเร็จ: $BACKUP_DIR/redis/redis_$TIMESTAMP.rdb"
else
    echo "ไม่สามารถสำรองข้อมูล Redis"
    exit 1
fi

# ลบไฟล์สำรองข้อมูลเก่า
echo "กำลังลบไฟล์สำรองข้อมูลเก่ากว่า $MAX_DAYS วัน..."
find $BACKUP_DIR/postgres -type f -name "*.gz" -mtime +$MAX_DAYS -delete
find $BACKUP_DIR/minio -type f -name "*.tar.gz" -mtime +$MAX_DAYS -delete
find $BACKUP_DIR/redis -type f -name "*.rdb" -mtime +$MAX_DAYS -delete

echo "สำรองข้อมูลเสร็จสิ้น"

# แสดงข้อมูลการใช้พื้นที่
echo "พื้นที่จัดเก็บสำรองข้อมูล:"
du -h $BACKUP_DIR

exit 0 