-- ตั้งค่า PostgreSQL ให้เหมาะสมกับ Xeon E5 2690v.1 (8 คอร์ 16 เธรด) RAM 32GB
ALTER SYSTEM SET max_connections = '100';
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET max_worker_processes = '8';
ALTER SYSTEM SET max_parallel_workers = '8';
ALTER SYSTEM SET max_parallel_workers_per_gather = '4';
ALTER SYSTEM SET random_page_cost = '1.1';
ALTER SYSTEM SET effective_io_concurrency = '200';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET default_statistics_target = '100';
ALTER SYSTEM SET autovacuum_max_workers = '4';
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = '0.05';
ALTER SYSTEM SET autovacuum_analyze_scale_factor = '0.025';

-- ลดการใช้งาน disk I/O
ALTER SYSTEM SET synchronous_commit = 'off';
ALTER SYSTEM SET commit_delay = '1000';
ALTER SYSTEM SET commit_siblings = '5';

-- เพิ่มประสิทธิภาพสำหรับการค้นหาและการจัดเรียง
ALTER SYSTEM SET enable_seqscan = 'on';
ALTER SYSTEM SET enable_indexscan = 'on';
ALTER SYSTEM SET enable_indexonlyscan = 'on';
ALTER SYSTEM SET enable_bitmapscan = 'on';
ALTER SYSTEM SET cpu_tuple_cost = '0.01';
ALTER SYSTEM SET cpu_index_tuple_cost = '0.005';
ALTER SYSTEM SET cpu_operator_cost = '0.0025';

-- เพิ่มประสิทธิภาพในสภาพแวดล้อมที่มีการเขียนมาก
ALTER SYSTEM SET wal_compression = 'on';
ALTER SYSTEM SET full_page_writes = 'off';
ALTER SYSTEM SET wal_writer_delay = '200ms';
ALTER SYSTEM SET wal_writer_flush_after = '1MB'; 