import TopBar from '@/components/layout/TopBar'
import DocSection from '@/components/docs/DocSection'

interface DocEntry {
  id: string
  title: string
  url?: string
  icon: string
  color: 'cyan' | 'purple' | 'amber' | 'green'
  sections: Array<{
    heading: string
    content?: string
    steps?: string[]
    items?: Array<{ label: string; path: string }>
  }>
}

const DBMS_ERP_DOCS: DocEntry[] = [
  {
    id: 'dbms-fundamentals',
    title: 'Database Management Systems — Fundamentals',
    icon: '🗄️',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'A Relational Database Management System (RDBMS) organizes data into tables (relations) composed of rows (tuples) and columns (attributes), governed by a schema. Each table has a primary key (unique row identifier), which may be a natural key (surrogate key is system-generated), composite key (multiple columns), or candidate key (any column eligible to be PK). Foreign keys enforce referential integrity between tables. ACID properties (Atomicity, Consistency, Isolation, Durability) ensure reliable transactions. DBMS types: Relational (MySQL, PostgreSQL, SQL Server, Oracle), Document (MongoDB, CouchDB), Key-Value (Redis, DynamoDB), Column-family (Cassandra, HBase), Graph (Neo4j, Amazon Neptune), Time-series (InfluxDB, TimescaleDB), NewSQL (CockroachDB, Google Spanner).',
      },
      {
        heading: 'Normalization Forms',
        items: [
          { label: '1NF — First Normal Form', path: 'Atomic values in every cell; no repeating groups or arrays in columns; each row uniquely identifiable' },
          { label: '2NF — Second Normal Form', path: '1NF + no partial dependency — every non-key attribute must depend on the whole composite primary key, not just part of it' },
          { label: '3NF — Third Normal Form', path: '2NF + no transitive dependency — non-key attributes must depend only on the PK, not on other non-key attributes' },
          { label: 'BCNF — Boyce-Codd Normal Form', path: 'Stronger 3NF: every determinant (LHS of a functional dependency) must be a candidate key' },
          { label: '4NF — Fourth Normal Form', path: 'BCNF + no multi-valued dependencies — a row should not store two or more independent multi-valued facts about an entity' },
          { label: '5NF — Fifth Normal Form', path: 'No join dependencies that cannot be inferred from candidate keys; eliminates redundancy from complex join scenarios' },
          { label: 'Denormalization', path: 'Deliberate violation of normal forms for performance gains — common in OLAP/data warehouse use cases; trades update anomalies for faster reads' },
        ],
      },
      {
        heading: 'ACID Properties',
        items: [
          { label: 'Atomicity', path: 'All operations in a transaction succeed entirely or none are applied — on failure the transaction is rolled back as if it never happened' },
          { label: 'Consistency', path: 'A transaction takes the database from one valid state to another; all defined constraints, rules, and cascades are preserved throughout' },
          { label: 'Isolation', path: 'Concurrent transactions execute as if serialized — uncommitted changes in one transaction are not visible to others (controlled by isolation level)' },
          { label: 'Durability', path: 'Once a transaction is committed it survives system crashes — enforced via Write-Ahead Logging (WAL) / redo log flushed to disk before acknowledgement' },
        ],
      },
      {
        heading: 'Transaction Isolation Levels',
        items: [
          { label: 'Read Uncommitted', path: 'Dirty reads allowed — a transaction may read uncommitted changes of another; fastest but least safe; rarely used in production' },
          { label: 'Read Committed', path: 'No dirty reads; only committed data visible; phantom reads and non-repeatable reads still possible; default in PostgreSQL and Oracle' },
          { label: 'Repeatable Read', path: 'No dirty or non-repeatable reads; same row read twice within transaction yields same value; phantoms still possible; default in MySQL InnoDB' },
          { label: 'Serializable', path: 'Full isolation — transactions execute as if serial; no dirty, non-repeatable, or phantom reads; slowest due to extensive locking or MVCC overhead' },
        ],
      },
      {
        heading: 'CAP Theorem',
        items: [
          { label: 'Consistency', path: 'Every read receives the most recent write or an error — all nodes see the same data at the same time' },
          { label: 'Availability', path: 'Every request receives a (non-error) response, though it may not contain the latest data' },
          { label: 'Partition Tolerance', path: 'The system continues to operate despite network partitions (message loss or delays) between nodes' },
          { label: 'Trade-off rule', path: 'A distributed system can only guarantee 2 of 3: RDBMS/HBase/ZooKeeper choose CP; Cassandra/DynamoDB/CouchDB choose AP. PACELC extends CAP to cover latency vs consistency when no partition exists' },
        ],
      },
      {
        heading: 'Indexing',
        items: [
          { label: 'Clustered Index', path: 'Data rows are physically sorted on disk in index key order; only one per table (usually the primary key); range scans are very fast' },
          { label: 'Non-Clustered Index', path: 'Separate B-Tree structure with pointers back to table rows; multiple allowed per table; slightly more overhead than clustered for row lookup' },
          { label: 'Composite Index', path: 'Index on multiple columns; column order matters — queries must match the leftmost prefix of the index to benefit (leading-column rule)' },
          { label: 'Covering Index', path: 'All columns needed by a query are stored in the index itself — avoids table (heap) lookup entirely; fastest possible read for that query pattern' },
          { label: 'Full-Text Index', path: 'Inverted index for tokenized word search — supports CONTAINS/MATCH AGAINST queries; far faster than LIKE %keyword% on large text' },
          { label: 'Partial Index', path: 'Index built on a filtered subset of rows (e.g., WHERE status = \'active\'); smaller and faster than full index when most queries target the subset' },
          { label: 'Hash Index', path: 'Maps key → exact bucket via hash function; O(1) equality lookup but cannot support range queries or ORDER BY; used in memory (MEMORY engine, Redis)' },
          { label: 'B-Tree Index', path: 'Balanced tree structure — the default index type in most RDBMS; supports both equality and range queries, ORDER BY, and prefix searches' },
        ],
      },
    ],
  },
  {
    id: 'sql-reference',
    title: 'SQL Quick Reference',
    icon: '💡',
    color: 'purple',
    sections: [
      {
        heading: 'SQL Categories',
        items: [
          { label: 'DDL — Data Definition Language', path: 'CREATE TABLE/VIEW/INDEX, ALTER TABLE (add/modify/drop column), DROP TABLE, TRUNCATE TABLE (fast delete all rows, no log), RENAME' },
          { label: 'DML — Data Manipulation Language', path: 'SELECT (read), INSERT INTO, UPDATE ... SET, DELETE FROM, MERGE/UPSERT (insert or update based on match condition)' },
          { label: 'DCL — Data Control Language', path: 'GRANT privilege ON object TO user/role; REVOKE privilege ON object FROM user/role — manages access permissions' },
          { label: 'TCL — Transaction Control Language', path: 'BEGIN/START TRANSACTION, COMMIT (persist changes), ROLLBACK (undo since last commit), SAVEPOINT name (partial rollback point), ROLLBACK TO SAVEPOINT name' },
        ],
      },
      {
        heading: 'Essential SELECT Patterns',
        steps: [
          'Basic filter and sort: SELECT first_name, last_name, salary FROM employees WHERE department_id = 10 AND salary > 50000 ORDER BY salary DESC LIMIT 20;',
          'GROUP BY with HAVING (filter on aggregates): SELECT department_id, COUNT(*) AS headcount, AVG(salary) AS avg_sal FROM employees GROUP BY department_id HAVING COUNT(*) > 5 ORDER BY avg_sal DESC;',
          'Subquery in WHERE: SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE country = \'PH\');',
          'CTE (WITH clause — improves readability, reusable in one query): WITH dept_avg AS (SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id) SELECT e.name, e.salary, d.avg_sal FROM employees e JOIN dept_avg d ON e.dept_id = d.dept_id WHERE e.salary > d.avg_sal;',
          'EXISTS vs IN: EXISTS stops at first match and is faster when subquery result is large — SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);',
          'UNION vs UNION ALL: UNION removes duplicates (adds sort step); UNION ALL keeps all rows including duplicates and is faster — SELECT city FROM customers UNION ALL SELECT city FROM suppliers;',
          'CASE WHEN expression: SELECT name, salary, CASE WHEN salary > 100000 THEN \'Senior\' WHEN salary > 60000 THEN \'Mid\' ELSE \'Junior\' END AS grade FROM employees;',
          'COALESCE (return first non-NULL) and NULLIF (return NULL if two values equal): SELECT COALESCE(phone, mobile, \'N/A\') AS contact, NULLIF(sales, 0) AS safe_sales FROM staff; — NULLIF prevents division by zero',
          'String functions: CONCAT(first_name, \' \', last_name), SUBSTRING(col, 1, 10), UPPER(col), LOWER(col), TRIM(col), REPLACE(col, \'old\', \'new\'), LENGTH/LEN(col)',
          'Date functions (SQL Server): GETDATE() current datetime, GETUTCDATE(), DATEADD(month, 3, order_date), DATEDIFF(day, start_date, end_date), FORMAT(order_date, \'yyyy-MM-dd\')',
          'Date functions (PostgreSQL): NOW(), CURRENT_DATE, order_date + INTERVAL \'3 months\', AGE(end_date, start_date), TO_CHAR(order_date, \'YYYY-MM-DD\')',
          'Aggregate functions: COUNT(*) counts all rows, COUNT(col) skips NULLs, SUM(amount), AVG(price), MAX(date), MIN(date), STRING_AGG(name, \', \' ORDER BY name) — PostgreSQL/SQL Server 2017+ concatenates strings',
        ],
      },
      {
        heading: 'JOIN Types with Examples',
        steps: [
          'INNER JOIN — only rows with a match in both tables: SELECT o.id, c.name FROM orders o INNER JOIN customers c ON o.customer_id = c.id; — customers without orders and orders without customers are excluded',
          'LEFT OUTER JOIN — all rows from the left table plus matching right rows (NULLs for no match): SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON c.id = o.customer_id; — shows customers even if they have no orders',
          'RIGHT OUTER JOIN — all rows from the right table: SELECT c.name, o.id FROM customers c RIGHT JOIN orders o ON c.id = o.customer_id; — shows all orders even if customer record is missing (rare, prefer LEFT JOIN with tables swapped)',
          'FULL OUTER JOIN — all rows from both tables (NULLs on either side for no match): SELECT c.name, o.id FROM customers c FULL OUTER JOIN orders o ON c.id = o.customer_id; — useful for reconciliation reports',
          'CROSS JOIN — cartesian product (every combination): SELECT s.size, c.color FROM sizes s CROSS JOIN colors c; — generates all size/color combinations; use carefully as result = rows_left × rows_right',
          'SELF JOIN — table joined to itself, used for hierarchical data (org chart, adjacency list): SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;',
          'Multiple JOINs — chain as needed: SELECT o.id, c.name, p.name AS product FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_lines ol ON ol.order_id = o.id JOIN products p ON ol.product_id = p.id;',
        ],
      },
      {
        heading: 'Window Functions',
        steps: [
          'ROW_NUMBER() assigns a unique sequential number within each partition — useful for picking one row per group: SELECT *, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM employees; — filter WHERE rn = 1 for highest-paid per dept',
          'RANK() vs DENSE_RANK(): RANK() skips numbers after ties (1,1,3); DENSE_RANK() does not skip (1,1,2): SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS rnk, DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk FROM employees;',
          'LAG and LEAD — access a previous or next row without a self-join: SELECT order_date, sales, LAG(sales, 1) OVER (ORDER BY order_date) AS prev_sales, LEAD(sales, 1) OVER (ORDER BY order_date) AS next_sales FROM daily_sales;',
          'Running total with SUM() OVER: SELECT order_date, amount, SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date ROWS UNBOUNDED PRECEDING) AS running_total FROM orders;',
          'NTILE(n) splits rows into n buckets (quartiles, deciles): SELECT name, salary, NTILE(4) OVER (ORDER BY salary) AS quartile FROM employees; — quartile 1 = lowest 25%, 4 = highest 25%',
          'FIRST_VALUE and LAST_VALUE: SELECT name, salary, FIRST_VALUE(name) OVER (PARTITION BY dept ORDER BY salary DESC) AS top_earner FROM employees; — LAST_VALUE needs ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING frame to work correctly',
        ],
      },
      {
        heading: 'Query Optimization',
        steps: [
          'Use EXPLAIN (PostgreSQL/MySQL) or EXPLAIN ANALYZE (PostgreSQL with actual timing) or SET STATISTICS IO ON + execution plan in SQL Server to see the query plan before tuning',
          'Identify full table scans: Seq Scan in PostgreSQL or Table Scan/Clustered Index Scan in SQL Server on large tables indicates a missing or unused index',
          'Add indexes on columns used in WHERE, JOIN ON, and ORDER BY clauses — check pg_stat_user_indexes or sys.dm_db_index_usage_stats for unused indexes to remove',
          'Avoid SELECT * — specify only needed columns; reduces I/O, enables covering indexes, and prevents issues when schema changes',
          'Write sargable predicates: avoid wrapping indexed columns in functions in WHERE — BAD: WHERE YEAR(order_date) = 2024; GOOD: WHERE order_date >= \'2024-01-01\' AND order_date < \'2025-01-01\'',
          'Eliminate N+1 queries — when an ORM fires one query to get a list then N queries per row for related data, replace with a JOIN or batch fetch (e.g., Hibernate eager loading, Django select_related)',
          'Partition large tables by range (date) or list (region) to enable partition pruning — queries with a filter on the partition key only scan relevant partitions',
          'Use connection pooling (PgBouncer for PostgreSQL, HikariCP for Java apps) to reduce connection overhead — creating a new DB connection costs 10-50ms; pooled connections reuse existing sessions',
        ],
      },
      {
        heading: 'Common SQL Errors and Fixes',
        items: [
          { label: 'NOT NULL constraint violation (ORA-01400 / SQL Server msg 515)', path: 'INSERT missing a required column value — add the column to INSERT or provide a DEFAULT value in the schema' },
          { label: 'Unique constraint / duplicate key violation', path: 'Inserting a duplicate value into a unique or primary key column — check existing data, use INSERT ... ON CONFLICT DO NOTHING (PG) or MERGE (SQL Server) for upsert logic' },
          { label: 'Foreign key constraint violation', path: 'Inserting a child record where the referenced parent does not exist, or deleting a parent that still has children — ensure parent exists first or use CASCADE delete/update' },
          { label: 'Deadlock detected', path: 'Two transactions each waiting for a lock held by the other — application must catch the error and retry; reduce by always locking resources in the same order and keeping transactions short' },
          { label: 'Query timeout / statement timeout exceeded', path: 'Long-running query exceeds configured timeout — optimize query with index and rewrite, or temporarily increase statement_timeout (PG) / query timeout (application layer)' },
          { label: 'Too many connections (FATAL: sorry, too many clients)', path: 'Application exhausting connection limit — add connection pooler (PgBouncer), check for connection leaks (missing close() calls), increase max_connections if RAM permits' },
          { label: 'Division by zero', path: 'Use NULLIF to avoid: total_sales / NULLIF(units_sold, 0) — returns NULL instead of error when denominator is zero' },
          { label: 'Implicit type conversion issues', path: 'Comparing VARCHAR column to integer literal forces full scan (index not used) — cast explicitly: WHERE id = CAST(\'123\' AS INT) or fix the data types to match' },
        ],
      },
    ],
  },
  {
    id: 'dba-tasks',
    title: 'Database Administration',
    icon: '🔧',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'A Database Administrator (DBA) is responsible for the full lifecycle of database systems: installation and configuration, schema and object management, performance tuning and query optimization, backup and recovery planning, security (users, roles, permissions, encryption), high availability and replication setup, capacity planning, version upgrades, and 24/7 monitoring and alerting. DBAs work across RDBMS platforms — SQL Server, PostgreSQL, MySQL/MariaDB, Oracle — each with its own toolset, but the underlying principles are the same.',
      },
      {
        heading: 'SQL Server / Azure SQL Administration',
        items: [
          { label: 'Create database and set recovery model', path: 'SSMS → Object Explorer → Databases → New Database; or: CREATE DATABASE MyDB; ALTER DATABASE MyDB SET RECOVERY FULL;' },
          { label: 'Create login and user with permissions', path: 'CREATE LOGIN appuser WITH PASSWORD = \'StrongP@ss1\'; USE MyDB; CREATE USER appuser FOR LOGIN appuser; ALTER ROLE db_datareader ADD MEMBER appuser; ALTER ROLE db_datawriter ADD MEMBER appuser;' },
          { label: 'Create and schedule backup job', path: 'SSMS → SQL Server Agent → Jobs → New Job; or: BACKUP DATABASE MyDB TO DISK = \'D:\\Backups\\MyDB_full.bak\' WITH COMPRESSION, CHECKSUM, STATS = 10;' },
          { label: 'View top wait statistics', path: 'SELECT TOP 10 wait_type, wait_time_ms, waiting_tasks_count FROM sys.dm_os_wait_stats WHERE wait_type NOT IN (\'SLEEP_TASK\',\'BROKER_TO_FLUSH\',\'SQLTRACE_BUFFER_FLUSH\') ORDER BY wait_time_ms DESC;' },
          { label: 'Find most expensive queries', path: 'SELECT TOP 10 SUBSTRING(st.text, (qs.statement_start_offset/2)+1, 200) AS query_text, qs.total_worker_time/qs.execution_count AS avg_cpu, qs.execution_count FROM sys.dm_exec_query_stats qs CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st ORDER BY avg_cpu DESC;' },
          { label: 'Enable TDE (Transparent Data Encryption)', path: 'CREATE MASTER KEY ENCRYPTION BY PASSWORD = \'...s3cr3t!\'; CREATE CERTIFICATE MyTDECert WITH SUBJECT = \'TDE Cert\'; CREATE DATABASE ENCRYPTION KEY WITH ALGORITHM = AES_256 ENCRYPTION BY SERVER CERTIFICATE MyTDECert; ALTER DATABASE MyDB SET ENCRYPTION ON;' },
          { label: 'Configure Always On Availability Group', path: 'SQL Server Configuration Manager → SQL Server Services → enable Always On; SSMS → New Availability Group Wizard; requires Windows Server Failover Cluster (WSFC) and Enterprise/Developer edition' },
          { label: 'Create SQL Agent job step', path: 'SSMS → SQL Server Agent → Jobs → right-click → New Job → Steps → New Step → select T-SQL, paste script; Schedules → set recurrence; Notifications → alert on failure' },
        ],
      },
      {
        heading: 'PostgreSQL Administration',
        items: [
          { label: 'psql meta-commands reference', path: '\\l list databases; \\c dbname connect; \\dt list tables in current schema; \\d tablename show columns/indexes/constraints; \\du list roles/users; \\x toggle expanded output; \\timing on/off; \\q quit' },
          { label: 'Create role and grant privileges', path: 'CREATE ROLE appuser WITH LOGIN PASSWORD \'StrongP@ss\'; GRANT CONNECT ON DATABASE mydb TO appuser; GRANT USAGE ON SCHEMA public TO appuser; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO appuser;' },
          { label: 'Backup and restore with pg_dump / pg_restore', path: 'pg_dump -Fc -Z9 -U postgres mydb > mydb_$(date +%Y%m%d).dump; pg_restore -U postgres -d mydb_restore mydb_20240101.dump; pg_dumpall -U postgres > full_cluster.sql (includes globals/roles)' },
          { label: 'VACUUM ANALYZE for maintenance', path: 'VACUUM ANALYZE tablename; — reclaims dead tuple space and updates planner statistics. VACUUM FULL tablename; — rewrites table, reclaims disk space, requires exclusive lock. Schedule autovacuum; check pg_stat_user_tables.n_dead_tup' },
          { label: 'Monitor active queries and locks', path: 'SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != \'idle\' ORDER BY duration DESC; — kill with: SELECT pg_cancel_backend(pid); or pg_terminate_backend(pid);' },
          { label: 'Detect blocking queries via pg_locks', path: 'SELECT bl.pid AS blocked_pid, a.query AS blocked_query, kl.pid AS blocking_pid, ka.query AS blocking_query FROM pg_catalog.pg_locks bl JOIN pg_catalog.pg_stat_activity a ON a.pid = bl.pid JOIN pg_catalog.pg_locks kl ON kl.transactionid = bl.transactionid AND kl.pid != bl.pid JOIN pg_catalog.pg_stat_activity ka ON ka.pid = kl.pid WHERE NOT bl.granted;' },
          { label: 'Key postgresql.conf tuning parameters', path: 'max_connections = 200; shared_buffers = 25% of RAM (e.g., 4GB for 16GB server); work_mem = 64MB (per sort/hash operation — multiply by max parallel workers); effective_cache_size = 75% of RAM; wal_buffers = 64MB; checkpoint_completion_target = 0.9' },
        ],
      },
      {
        heading: 'MySQL / MariaDB Administration',
        items: [
          { label: 'Show active queries and processes', path: 'SHOW PROCESSLIST; — shows all connections and their current query; SHOW FULL PROCESSLIST; for full query text; KILL <id>; to terminate a specific connection' },
          { label: 'Check server status and variables', path: 'SHOW STATUS LIKE \'Threads_connected\'; SHOW VARIABLES LIKE \'innodb_buffer_pool_size\'; SHOW ENGINE INNODB STATUS\\G — detailed InnoDB internals including transactions, locks, and I/O stats' },
          { label: 'Backup with mysqldump', path: 'mysqldump -u root -p --single-transaction --routines --triggers --all-databases > full_backup.sql; mysqldump -u root -p mydb > mydb.sql; mysqlpump for parallel export (MySQL 5.7+)' },
          { label: 'Slow query analysis with pt-query-digest', path: 'Enable slow log: SET GLOBAL slow_query_log = ON; SET GLOBAL long_query_time = 1; then: pt-query-digest /var/log/mysql/slow.log > slow_report.txt — groups and ranks queries by total execution time' },
          { label: 'Read EXPLAIN output', path: 'EXPLAIN SELECT ... — check type column: system/const/eq_ref/ref = good; range = acceptable; index = index scan; ALL = full table scan (bad). Check key column for index used. rows column = estimated rows examined' },
          { label: 'Binary log and PITR', path: 'SHOW BINARY LOGS; SHOW BINLOG EVENTS IN \'binlog.000123\'; mysqlbinlog --start-datetime="2024-01-01 00:00:00" --stop-datetime="2024-01-01 12:00:00" binlog.000123 | mysql -u root -p for point-in-time recovery' },
          { label: 'Set up replication (MySQL 8.0+)', path: 'On primary: SHOW MASTER STATUS; On replica: CHANGE REPLICATION SOURCE TO SOURCE_HOST=\'primary_ip\', SOURCE_USER=\'repl\', SOURCE_PASSWORD=\'...\', SOURCE_LOG_FILE=\'binlog.000001\', SOURCE_LOG_POS=4; START REPLICA; SHOW REPLICA STATUS\\G' },
          { label: 'InnoDB buffer pool sizing', path: 'Set innodb_buffer_pool_size = 70–80% of available RAM for dedicated DB server. Check hit ratio: SHOW STATUS LIKE \'Innodb_buffer_pool_read%\'; ratio = 1 - (reads/read_requests) should be > 99%' },
        ],
      },
      {
        heading: 'Backup and Recovery',
        steps: [
          'Full backup (weekly): capture complete database snapshot — SQL Server: BACKUP DATABASE TO DISK WITH COMPRESSION; PostgreSQL: pg_dump -Fc; MySQL: mysqldump --single-transaction. Store to local fast disk then move to offsite (Azure Blob Storage, AWS S3)',
          'Differential backup (daily): captures only changes since last full backup — SQL Server: BACKUP DATABASE TO DISK WITH DIFFERENTIAL. Reduces backup window and storage vs daily full backups',
          'Transaction log backup (every 15 minutes for low RPO): SQL Server: BACKUP LOG TO DISK; PostgreSQL: configure archive_command in postgresql.conf to copy WAL segments to backup location; MySQL: binary log shipping',
          'Test restore quarterly: restore a full backup to a non-production instance and verify data integrity — untested backups are not backups. Document time taken to meet RTO',
          'PITR (Point-in-Time Recovery) procedure: restore last full backup → apply differential (if used) → apply transaction log backups up to target timestamp. Document exact commands and test annually',
          'Verify backup checksum: SQL Server: RESTORE VERIFYONLY FROM DISK = \'backup.bak\'; PostgreSQL pg_dump uses checksums by default with -Fc. Corrupt backup detected before it is needed saves the day',
          'Store backups offsite: local backups protect against file deletion; offsite (Azure Blob, S3, tape vault) protects against site disaster. Verify offsite copies are accessible and not corrupted',
          'Document RTO (Recovery Time Objective) and RPO (Recovery Point Objective): typical targets for critical OLTP — RPO 15 minutes (max data loss), RTO 4 hours (max downtime). Tier less-critical databases accordingly',
        ],
      },
      {
        heading: 'Database Performance Troubleshooting',
        steps: [
          'Step 1 — CPU high on DB server: connect to DB and identify top queries. SQL Server: SELECT TOP 10 from sys.dm_exec_query_stats ORDER BY total_worker_time DESC. PostgreSQL: SELECT query, calls, total_exec_time FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;',
          'Step 2 — Long-running transactions blocking others: SQL Server: EXEC sp_who2 — look for BlkBy column (non-zero = blocked). PostgreSQL: check pg_locks joined to pg_stat_activity. Kill the head blocker after confirming with application team',
          'Step 3 — Identify wait type to find root cause: SQL Server: SELECT TOP 10 wait_type, wait_time_ms FROM sys.dm_os_wait_stats ORDER BY wait_time_ms DESC. Key types: CXPACKET/CXCONSUMER = parallelism; LCK_M_X = exclusive lock contention; PAGEIOLATCH_SH = disk I/O; WRITELOG = log flush',
          'Step 4 — Indexing gaps: SQL Server: SELECT * FROM sys.dm_db_missing_index_details — shows columns that would benefit from an index. PostgreSQL: look for Seq Scan on large tables in EXPLAIN output',
          'Step 5 — Stale statistics: outdated statistics cause the query optimizer to generate bad execution plans. SQL Server: EXEC sp_updatestats or UPDATE STATISTICS tablename. PostgreSQL: ANALYZE tablename. Verify auto-update statistics is enabled',
          'Step 6 — Parameter sniffing (SQL Server): a cached execution plan optimized for one parameter set performs poorly for another. Diagnose: sys.dm_exec_cached_plans. Fix options: OPTION (RECOMPILE) per query, OPTIMIZE FOR UNKNOWN hint, or sp_recompile on the stored procedure',
        ],
      },
    ],
  },
  {
    id: 'erp-overview',
    title: 'ERP Systems — Overview & Comparison',
    icon: '🏢',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content:
          'ERP (Enterprise Resource Planning) integrates all core business functions — Finance, HR, Procurement, Manufacturing, Sales, and Supply Chain — into a single unified system backed by a shared database. This eliminates departmental data silos, reduces manual reconciliation, enforces process standardization, and provides real-time enterprise-wide reporting. ERP replaces disparate spreadsheets and standalone departmental applications. Key benefits: single source of truth for all operational data, standardized and auditable business processes, regulatory compliance (audit trails, SOX, IFRS), and real-time analytics and dashboards for management decision-making.',
      },
      {
        heading: 'Major ERP Vendors Comparison',
        items: [
          { label: 'SAP S/4HANA Cloud / ECC', path: 'Global market leader in enterprise ERP; strongest in manufacturing, financial accounting, and supply chain; S/4HANA is the modern in-memory HANA-based suite; ECC is the legacy on-premise version; steep learning curve; best for large enterprise (1000+ employees)' },
          { label: 'Oracle Fusion Cloud ERP', path: 'Cloud-native ERP from Oracle; strongest in financial management and HR (Oracle HCM Cloud); main competitor to SAP at enterprise level; good for finance-driven organizations and companies already using Oracle DB' },
          { label: 'Microsoft Dynamics 365', path: 'F&O (Finance & Operations) for large enterprise; Business Central (BC) for SMB and mid-market; deep integration with Microsoft 365 (Outlook, Excel, Teams), Azure, and Power Platform (Power BI, Power Automate); familiar UI for Microsoft-heavy organizations' },
          { label: 'Infor CloudSuite', path: 'Industry-specific ERP suites (manufacturing, distribution, healthcare, hospitality); strong in process manufacturing and food & beverage; often chosen for industry-specific functionality out-of-the-box' },
          { label: 'Sage 300 / Sage Intacct', path: 'Mid-market focus; Intacct is cloud-native and strong in financial management for services companies; popular with non-profits and professional services; lower TCO than SAP/Oracle' },
          { label: 'Odoo', path: 'Open-source modular ERP; community (free) and enterprise editions; strong for SMB; can be self-hosted; broad module catalog (CRM, eCommerce, Manufacturing, Accounting); lower upfront cost but requires implementation effort' },
          { label: 'Oracle NetSuite', path: 'Cloud ERP (SaaS) from Oracle for mid-market; strong in retail, wholesale distribution, and e-commerce; built-in CRM and e-commerce; popular for fast-growing companies and multi-subsidiary operations' },
        ],
      },
      {
        heading: 'ERP Modules Reference',
        items: [
          { label: 'Financial Management (FI/GL)', path: 'General Ledger (chart of accounts, journal entries, period close), Accounts Payable (vendor invoices, payment runs), Accounts Receivable (customer invoices, collections, dunning), Fixed Assets (depreciation, asset register), Treasury (cash management, bank reconciliation)' },
          { label: 'Controlling / Costing (CO)', path: 'Cost Center Accounting (track costs by organizational unit), Profit Center Accounting, Internal Orders, Product Costing (standard vs actual cost), Profitability Analysis (CO-PA)' },
          { label: 'Human Capital Management (HCM)', path: 'Employee master data, payroll processing, time and attendance, leave management, talent acquisition and performance management, organizational management' },
          { label: 'Procurement / Materials Management (MM)', path: 'Purchase requisition → purchase order → goods receipt → invoice verification (3-way match), vendor master management, contract management, purchasing analytics' },
          { label: 'Sales & Distribution (SD)', path: 'Sales order → delivery → billing (order-to-cash), customer master, pricing conditions and rebates, credit management, returns processing' },
          { label: 'Supply Chain / Warehouse Management (WM/EWM)', path: 'Inventory management, warehouse structure (bins, zones), goods movements (GR/GI/transfers), batch management, serial number tracking, physical inventory, transportation management' },
          { label: 'Manufacturing / Production Planning (PP)', path: 'Bill of Materials (BOM), routing/work centers, MRP (Material Requirements Planning), production orders, shop floor control, capacity planning, quality management integration' },
          { label: 'Business Intelligence / Analytics', path: 'Embedded analytics (SAP Analytics Cloud, Power BI in D365), standard reports by module, KPI dashboards, data extraction to data warehouse (SAP BW, Azure Synapse), ad-hoc query tools' },
        ],
      },
      {
        heading: 'ERP Implementation Lifecycle',
        steps: [
          'Phase 1 — Project Preparation: define project charter (scope, budget, timeline, executive sponsor); assemble project team (business process owners, key users, IT, implementation partner); provision sandbox/development environments; conduct kick-off workshop',
          'Phase 2 — Business Blueprint / Fit-Gap Analysis: document AS-IS business processes; conduct fit-gap workshops per module to compare standard ERP functionality against business requirements; configuration decisions documented; identify custom development needs (gap objects, interfaces, reports)',
          'Phase 3 — Realization: configure ERP system per approved blueprint (company codes, chart of accounts, org structure, pricing, workflow); develop custom objects (reports, interfaces, enhancements); design and build data migration objects (legacy data extract, transform, load); unit test each configured process',
          'Phase 4 — Final Preparation: conduct end-user training (role-based); perform data migration dress rehearsal (mock cutover); complete User Acceptance Testing (UAT) with sign-off from business process owners; finalize cutover plan with detailed task list and timings; performance testing',
          'Phase 5 — Go-Live & Hypercare: execute cutover plan (freeze legacy system, run final data migration, activate production, validate opening balances); hypercare team on-site or on-call for 2–4 weeks post go-live; monitor for issues; support tickets triaged daily; business continuity plan if critical issue found',
          'Phase 6 — Run (BAU Support): stabilize system; transition to ongoing support model (internal team + vendor support agreement); periodic patches and upgrades; change request process for enhancements; training for new hires; annual roadmap review with business',
        ],
      },
      {
        heading: 'ERP Integration Patterns',
        items: [
          { label: 'Point-to-Point (P2P)', path: 'Direct API or DB calls between two systems; simple to build but creates a tangled web of dependencies as system count grows; hard to monitor and maintain; acceptable for 2–3 system integrations only' },
          { label: 'ESB / Middleware (Hub-and-Spoke)', path: 'Centralized integration hub — MuleSoft Anypoint, Dell Boomi, SAP Integration Suite (CPI/PI), IBM App Connect; ERP connects to hub; other systems connect to hub; single point of monitoring and governance; scales well' },
          { label: 'iPaaS (Cloud Integration Platform)', path: 'Cloud-based integration — Azure Logic Apps, Microsoft Power Automate, Workato, Zapier; low-code connectors for SaaS-to-ERP scenarios; suitable for non-critical, lower-volume integrations' },
          { label: 'Event-Driven / Message Queue', path: 'ERP publishes events (document posted, order created) to message broker — SAP Event Mesh, Azure Service Bus, Apache Kafka; consumers process asynchronously; decoupled and resilient to downstream system downtime' },
          { label: 'File-Based (SFTP / EDI)', path: 'Flat files (CSV, XML, IDOC, X12/EDIFACT for EDI) transferred via SFTP on a schedule; legacy but still dominant in supply chain B2B and third-party logistics integrations; simple but lacks real-time capability' },
          { label: 'Direct Database Integration', path: 'Not recommended — reading directly from ERP database bypasses business logic, breaks with upgrades, creates tight coupling, and violates vendor support terms; use API or middleware instead' },
        ],
      },
      {
        heading: 'Common ERP Problems & Solutions',
        steps: [
          'Users posting to wrong company code: enforce company code assignment at user level via security roles; use field validation or screen variant to default correct company code; review auth objects for company code restriction',
          'Master data inconsistencies (duplicate vendors, inconsistent GL accounts across plants): implement MDM (Master Data Management) governance process; designate data owners per master data type; periodic data quality reports; consolidation workflow for new master data requests',
          'Performance degradation during business hours: check for overlapping background jobs (report scheduling, MRP runs, interfaces) — reschedule to off-peak hours; review and optimize custom reports/queries; check DB statistics are current; engage basis/system team to review work process usage',
          'Integration interface failures: check middleware monitoring dashboard for error alerts; verify source system sent the message (check outbound interface log); review middleware for transform/mapping errors; check API credentials and certificates are not expired; verify firewall rules for IP/port; escalate to integration developer if iFlow/mapping issue',
          'Period not open for posting in FI: FI administrator must open the posting period in the business configuration (SAP: OB52; D365: Ledger Calendars; BC: Accounting Periods); verify fiscal year variant is correctly assigned to the company code',
          'Approval workflow stuck — document pending for days: check if the approver is on leave (no substitute configured); verify workflow task assignment rules are correctly configured; check workflow log for error messages; manually reassign or skip the step if business-critical; configure substitution rules to prevent recurrence',
          'Month-end close delays: maintain a pre-close checklist (clear GR/IR, post all accruals, run depreciation, clear intercompany accounts); start parallel close preparation tasks early; daily close status meeting in close week; automate recurring journal entries; post-close retro to identify bottlenecks',
        ],
      },
    ],
  },
  {
    id: 'dynamics365',
    title: 'Microsoft Dynamics 365',
    icon: '📊',
    color: 'cyan',
    sections: [
      {
        heading: 'Overview',
        content:
          'Microsoft Dynamics 365 is Microsoft\'s cloud ERP and CRM platform, built on Azure. Two main ERP products: Dynamics 365 Finance (formerly Finance & Operations) and Dynamics 365 Supply Chain Management for large enterprise, and Dynamics 365 Business Central (BC) for SMB and mid-market. These are deeply integrated with Microsoft 365 (Outlook, Excel, Teams), Azure services, and the Power Platform (Power BI, Power Automate, Power Apps, Copilot Studio). Lifecycle Services (LCS) is the deployment and support portal for Finance & SCM. Business Central is deployed via the Microsoft 365 admin center or partner portals.',
      },
      {
        heading: 'Dynamics 365 Finance & Operations',
        items: [
          { label: 'Navigation and Workspaces', path: 'Home page shows role-specific workspaces (Accounts Payable, Budget, Project Management); use global search (top bar) to navigate to any form by name or menu path; recently used items pinned on navigation bar' },
          { label: 'Financial Modules — General Ledger', path: 'Chart of accounts, main accounts, financial dimensions (Business Unit, Cost Center, Department), journal types (daily journal, vendor invoice journal), period close tasks, trial balance, financial statements' },
          { label: 'Accounts Payable workflow', path: 'Vendor invoice → matching (2-way or 3-way match with PO/product receipt) → approval workflow → payment proposal → payment journal → bank reconciliation' },
          { label: 'Accounts Receivable', path: 'Customer free text invoice or sales order invoice → post → payment journal → customer payment matching → aging reports → collections management → interest notes and dunning letters' },
          { label: 'Supply Chain — Procurement', path: 'Purchase requisition → purchase order (PO) → confirm PO → send to vendor → product receipt (goods receipt) → vendor invoice → 3-way match → post → payment' },
          { label: 'Module parameters and configuration', path: 'Each module has a Parameters form (Accounts Payable Parameters, General Ledger Parameters, Procurement and Sourcing Parameters) — controls default behavior; changes affect all users in the legal entity' },
          { label: 'LCS (Lifecycle Services)', path: 'lifecycle.dynamics.com — manage cloud environments (deploy, restart, database refresh, package deployment); view monitoring dashboards; submit support tickets to Microsoft; manage code deployments via asset library' },
        ],
      },
      {
        heading: 'Business Central Tasks',
        items: [
          { label: 'Tell Me search bar', path: 'Use the magnifying glass (Alt+Q) "Tell me what you want to do" to search any page, report, or action by name — fastest navigation method in BC' },
          { label: 'Create Customer / Vendor / Item master', path: 'Search "Customers" or "Vendors" → New → fill General, Address, Invoicing, Payments tabs; Item card: search "Items" → New → set Type (Inventory/Service/Non-Inventory), Base Unit of Measure, Costing Method' },
          { label: 'Post Purchase Invoice', path: 'Purchase → Invoices → New → select Vendor → add Lines (Item/G/L Account, Quantity, Direct Unit Cost) → Post (Ctrl+F9) — creates vendor ledger entry and inventory/G/L posting' },
          { label: 'Post Sales Invoice', path: 'Sales → Invoices → New → select Customer → add Lines → Post — creates customer ledger entry; or post from Sales Order to generate posted shipment and invoice simultaneously' },
          { label: 'Bank Account Reconciliation', path: 'Cash Management → Bank Account Reconciliation → New → import bank statement → auto-match transactions → manually match remainders → Post Reconciliation — clears matched entries' },
          { label: 'Run Aged Receivables Report', path: 'Search "Aged Accounts Receivable" → set date and aging bucket parameters → Preview/Print — shows outstanding customer balances grouped by days overdue' },
          { label: 'Item Journal for Inventory Adjustment', path: 'Inventory → Item Journals → select journal batch → enter Item No., Location, Quantity (positive = increase, negative = decrease) → Post — creates item ledger and value entries' },
          { label: 'Power BI Embedded Reports', path: 'BC home page → select Power BI report part → connect your Power BI workspace → pin reports to role center; or: search "Power BI Reports" to manage available reports' },
          { label: 'AL Extension deployment', path: 'VS Code with AL Language extension → connect to BC sandbox (launch.json with server/tenant) → F5 to publish and debug; production: download .app file → BC Extension Management → Upload Extension' },
        ],
      },
      {
        heading: 'D365 Administration',
        steps: [
          'Manage users: create users in Microsoft Entra ID (formerly Azure AD) — they automatically sync to D365. In D365 Finance: System Administration → Users → assign Security Roles (e.g., Accounting Manager, Purchasing Agent)',
          'Set up Legal Entities (companies): System Administration → Organizations → Legal Entities → New — configure company code, address, currency, fiscal calendar. Users can switch between legal entities via the company picker',
          'Configure Number Sequences: Organization Administration → Number Sequences — assign sequences to documents (purchase orders, sales orders, customer accounts). Gaps in number sequences are normal; use "Continuous" flag only when regulatory required (performance impact)',
          'Manage Batch Jobs: System Administration → Batch Jobs — view running and waiting jobs, set recurrence, change server group assignment, check error logs for failed batches. Critical batch jobs: MRP, statement processing, aging calculation',
          'Monitor Integration errors: Data Management workspace → Job History — shows all data import/export jobs and error details. Integration REST APIs monitored via Azure API Management or middleware. Check OData entity availability via: /data/$metadata',
          'Deploy updates via LCS (Finance): LCS Project → Environments → apply Software Deployable Package; schedule a maintenance window; UAT environment first; production deployment requires Microsoft-scheduled downtime window (typically 4–8 hours)',
        ],
      },
      {
        heading: 'Power Platform Integration',
        items: [
          { label: 'Power Automate flows', path: 'Trigger D365 flows on record creation/update (Dataverse triggers) or on schedule; common patterns: approval routing, Teams notifications on new sales orders, document generation and email on invoice post' },
          { label: 'Power Apps canvas apps', path: 'Build custom mobile UIs connecting to D365/Dataverse — field service, inventory count app, manager approval screens — without full D365 license for every user' },
          { label: 'Power BI embedded analytics', path: 'Publish Power BI reports to workspace → pin to D365 role centers; use DirectQuery to D365/Dataverse for near-real-time; or scheduled refresh from Dataflow for performance; built-in D365 Finance financial reporting via Financial Reporter' },
          { label: 'Dataverse as unified data layer', path: 'Common Data Model tables shared across D365 apps (Sales, Customer Service, Field Service, HR); Power Platform apps and flows read/write Dataverse natively; D365 BC data exposed via BC APIs or Business Central connector' },
          { label: 'Copilot Studio (AI chatbot)', path: 'Build custom AI assistants grounded in D365 data — FAQ bot for employees (HR policies, IT support), customer service bot for portal users; integrates with Teams and external websites' },
          { label: 'Power Pages (external portals)', path: 'Build secure external-facing websites connected to Dataverse — customer self-service portal (order status, invoice download), vendor portal (PO acknowledgement, ASN submission)' },
        ],
      },
    ],
  },
  {
    id: 'db-troubleshooting',
    title: 'Database Troubleshooting & Problem Solving',
    icon: '🔍',
    color: 'purple',
    sections: [
      {
        heading: 'Overview',
        content:
          'Systematic database problem solving follows a consistent methodology: Identify (what are the symptoms, error messages, and when did it start?) → Reproduce (can you trigger the issue reliably?) → Isolate (which query, table, user, time window is affected?) → Diagnose (examine logs, wait statistics, execution plans, lock information) → Fix (apply targeted solution: add index, rewrite query, adjust configuration, scale hardware) → Prevent (implement monitoring alerts, document runbook, schedule regular maintenance). Avoid making multiple changes simultaneously — change one variable at a time to understand causation.',
      },
      {
        heading: 'SQL Server Diagnostic Queries',
        steps: [
          'Active queries with execution plan: SELECT r.session_id, r.status, r.cpu_time, r.total_elapsed_time, r.wait_type, SUBSTRING(st.text, (r.statement_start_offset/2)+1, 200) AS query_text, qp.query_plan FROM sys.dm_exec_requests r CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) st CROSS APPLY sys.dm_exec_query_plan(r.plan_handle) qp WHERE r.session_id > 50;',
          'Top wait types (clear before monitoring: DBCC SQLPERF("sys.dm_os_wait_stats", CLEAR)): SELECT TOP 15 wait_type, wait_time_ms, waiting_tasks_count, CAST(100.0 * wait_time_ms / SUM(wait_time_ms) OVER() AS DECIMAL(5,2)) AS pct FROM sys.dm_os_wait_stats WHERE wait_type NOT IN (\'SLEEP_TASK\',\'LAZYWRITER_SLEEP\',\'SQLTRACE_BUFFER_FLUSH\',\'CLR_AUTO_EVENT\',\'DISPATCHER_QUEUE_MONITOR\') ORDER BY wait_time_ms DESC;',
          'Most expensive queries by total CPU: SELECT TOP 10 SUBSTRING(st.text,(qs.statement_start_offset/2)+1,300) AS query, qs.total_worker_time AS total_cpu, qs.execution_count, qs.total_worker_time/qs.execution_count AS avg_cpu, qs.total_elapsed_time/qs.execution_count AS avg_elapsed FROM sys.dm_exec_query_stats qs CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st ORDER BY total_cpu DESC;',
          'Transaction log file usage: DBCC SQLPERF(LOGSPACE); — shows log file size and percentage used per database. If log is full, identify what is preventing log truncation: SELECT name, log_reuse_wait_desc FROM sys.databases; Common causes: active transaction, LOG_BACKUP not scheduled, replication not caught up',
          'Missing index recommendations from query optimizer: SELECT TOP 10 migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans) AS improvement_measure, mid.statement AS table_name, mid.equality_columns, mid.inequality_columns, mid.included_columns FROM sys.dm_db_missing_index_groups mig JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle JOIN sys.dm_db_missing_index_details mid ON mig.index_handle = mid.index_handle ORDER BY improvement_measure DESC;',
          'sp_BlitzFirst (Brent Ozar First Responder Kit — free): EXEC sp_BlitzFirst @Seconds = 30; — captures 30 seconds of wait stats and current blocking to give a quick health snapshot. Install from github.com/BrentOzarULTD/SQL-Server-First-Responder-Kit',
        ],
      },
      {
        heading: 'PostgreSQL Diagnostic Queries',
        steps: [
          'Active queries longer than 5 seconds: SELECT pid, now() - query_start AS duration, state, wait_event_type, wait_event, LEFT(query, 150) AS query FROM pg_stat_activity WHERE state != \'idle\' AND query_start < now() - interval \'5 seconds\' ORDER BY duration DESC;',
          'Enable pg_stat_statements (best practice — add to shared_preload_libraries in postgresql.conf then restart): SELECT query, calls, total_exec_time/calls AS avg_ms, rows/calls AS avg_rows FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20; — persists query statistics across connections',
          'Blocking queries (find what is blocking what): SELECT bl.pid AS blocked_pid, LEFT(ba.query, 80) AS blocked_query, kl.pid AS blocking_pid, LEFT(ka.query, 80) AS blocking_query, now() - ba.query_start AS blocked_duration FROM pg_catalog.pg_locks bl JOIN pg_catalog.pg_stat_activity ba ON ba.pid = bl.pid JOIN pg_catalog.pg_locks kl ON kl.transactionid = bl.transactionid AND kl.pid != bl.pid AND kl.granted JOIN pg_catalog.pg_stat_activity ka ON ka.pid = kl.pid WHERE NOT bl.granted;',
          'Table bloat (dead tuples needing vacuum): SELECT schemaname, relname AS table_name, n_dead_tup AS dead_tuples, n_live_tup AS live_tuples, ROUND(100.0 * n_dead_tup / NULLIF(n_dead_tup + n_live_tup, 0), 2) AS dead_pct, last_autovacuum, last_autoanalyze FROM pg_stat_user_tables WHERE n_dead_tup > 1000 ORDER BY dead_tuples DESC;',
          'Checkpoint and BGWriter performance: SELECT checkpoints_timed, checkpoints_req, checkpoint_write_time, checkpoint_sync_time, buffers_clean, maxwritten_clean, buffers_backend FROM pg_stat_bgwriter; — high checkpoints_req (requested) vs checkpoints_timed indicates WAL is filling up faster than checkpoint interval; increase max_wal_size',
          'Detailed query plan with actual timing and buffer hits: EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT, VERBOSE) SELECT ...; — Buffers: shows shared/local/temp blocks hit (from cache) vs read (from disk); Actual Rows vs Plan Rows discrepancy indicates stale statistics',
        ],
      },
      {
        heading: 'Common Performance Issues',
        items: [
          { label: 'Missing Index (Seq Scan on large table)', path: 'Symptom: Seq Scan in EXPLAIN on table with millions of rows; high I/O wait. Fix: CREATE INDEX CONCURRENTLY idx_name ON table(column); verify EXPLAIN now shows Index Scan. Monitor index usage — remove unused indexes (overhead on writes)' },
          { label: 'Stale Statistics (wrong cardinality estimates)', path: 'Symptom: plan row estimate wildly off from actual rows; optimizer chooses wrong join order or loop type. Fix: ANALYZE tablename (PG); UPDATE STATISTICS tablename (SQL Server); ensure autovacuum/auto-update-statistics is enabled' },
          { label: 'Parameter Sniffing (SQL Server)', path: 'Symptom: stored proc fast for one user, slow for another; cached plan is optimal for first execution\'s parameters but not current ones. Fix: OPTION (RECOMPILE) appended to query; or OPTIMIZE FOR UNKNOWN hint; or sp_recompile \'ProcName\'' },
          { label: 'N+1 Query Problem', path: 'Symptom: application fires 1 query to list 100 orders then 100 separate queries for each order\'s customer; total 101 queries vs 1. Fix: use JOIN or batch fetch (Hibernate: fetch=JOIN or @BatchSize; Django: select_related(); Sequelize: include:)' },
          { label: 'Lock Contention', path: 'Symptom: transactions waiting on LCK_M_X (SQL Server) or lock in pg_locks; throughput drops under concurrent load. Fix: keep transactions as short as possible; avoid user interaction inside a transaction; use READ COMMITTED snapshot isolation (RCSI) in SQL Server' },
          { label: 'TempDB Contention (SQL Server)', path: 'Symptom: PAGELATCH_EX waits on tempdb pages 1, 2, 3 (allocation bitmaps). Fix: add TempDB data files equal to number of logical CPU cores (up to 8); enable trace flag 1118 (pre-SQL 2016); avoid excessive temp table usage in tight loops' },
          { label: 'Connection Pool Exhausted', path: 'Symptom: application errors "too many connections" or pool timeout; DB CPU low but app is hung. Fix: add connection pooler (PgBouncer in transaction mode); check for connection leaks (missing finally{conn.close()} in app code); reduce max_connections and rely on pooler' },
        ],
      },
      {
        heading: 'IT Problem Solving Methodology',
        steps: [
          'Step 1 — Define the problem clearly: state what IS happening vs what SHOULD happen. Record since when (exact time if possible), who is affected (one user, department, everyone), and what error message or behavior is observed. Vague problem statements ("it\'s slow") lead to wasted investigation.',
          'Step 2 — Gather data: collect relevant logs (application, database, OS, network), screenshots of error messages, timeline of events, and any recent change records. Do not rely on user interpretation — examine the actual evidence.',
          'Step 3 — Isolate variables: ask what changed recently before the issue started — deployments, configuration changes, hardware failures, schema changes, data volume growth, scheduled jobs. Check change management records.',
          'Step 4 — Form hypothesis: based on available evidence, identify the single most likely root cause. Prioritize: recent changes are prime suspects. Common causes first (indexing, configuration) before exotic causes (bugs, hardware).',
          'Step 5 — Test hypothesis: make one change at a time and measure the impact. If the change does not resolve the issue, revert it before trying the next hypothesis. Changing multiple things simultaneously makes it impossible to know what worked.',
          'Step 6 — Implement fix: once hypothesis is confirmed in non-production, implement the fix in production during an appropriate change window. Document what was changed, why, and expected outcome.',
          'Step 7 — Verify resolution: confirm the original symptom is gone. Monitor for recurrence over an appropriate period (1 hour for performance, 1 full business cycle for intermittent issues).',
          'Step 8 — Post-mortem and documentation: write an incident report covering timeline, root cause, resolution, and prevention measures. Update the runbook/knowledge base. Share learnings with the team to prevent recurrence.',
        ],
      },
      {
        heading: 'Root Cause Analysis Techniques',
        items: [
          { label: '5-Why Analysis', path: 'Iteratively ask "why?" 5 times to drill from symptom to root cause. Example: DB slow → why? → missing index → why? → developer did not add index → why? → no index review in code review checklist → Root cause: process gap in development standards' },
          { label: 'Fishbone / Ishikawa Diagram', path: 'Cause-and-effect diagram with 6 categories (5M+E): People (training, error), Process (procedure, workflow), Technology (software, infrastructure), Environment (physical, external), Materials (data, inputs), Measurement (metrics, monitoring). Brainstorm causes in each category' },
          { label: 'Fault Tree Analysis (FTA)', path: 'Top-down deductive analysis: start with undesired event (top node); decompose with AND gates (all inputs must occur) and OR gates (any input causes the event); works down to basic events (component failures, human errors)' },
          { label: 'Timeline Analysis', path: 'Reconstruct a chronological sequence of events leading to the incident — events, changes, alerts, log entries. Visualize on a timeline to identify the trigger event and causal chain. Particularly useful for complex multi-system failures' },
          { label: 'Change Analysis', path: 'Focus specifically on what changed immediately before the issue began — code deployment, config change, infrastructure change, data load. Most incidents are caused by change. Correlate incident time with change records' },
          { label: 'FMEA — Failure Mode and Effects Analysis', path: 'Proactive risk assessment: for each system component, identify possible failure modes, their effects, likelihood (1–10), severity (1–10), and detectability (1–10). Calculate RPN (Risk Priority Number = L × S × D). Prioritize mitigation for highest RPN items' },
        ],
      },
    ],
  },
  {
    id: 'erp-problem-solving',
    title: 'ERP Problem Solving & Support',
    icon: '⚙️',
    color: 'amber',
    sections: [
      {
        heading: 'Overview',
        content:
          'ERP support requires understanding the full application stack: UI layer (SAP Fiori / browser / Windows client), application server (ABAP/Java stack in SAP, .NET in Dynamics), database tier (HANA, SQL Server, Oracle), middleware/integration layer, and the business process itself. Most ERP issues fall into six categories: Authorization (user cannot perform an action due to missing permission), Data (wrong master data, missing configuration data), Configuration (business rules incorrectly set up in the system), Integration (interface between systems is failing), Performance (system is slow), and User Training (correct process not followed — the most common root cause in newly go-live systems).',
      },
      {
        heading: 'ERP Incident Triage Steps',
        steps: [
          'Get exact error message with screenshot: ask the user to capture the full screen including transaction/app name, error message text, and any error number. A vague "it doesn\'t work" report cannot be triaged — always get the error message.',
          'Determine scope — one user or many: single user affected → likely an authorization issue, user-specific settings, or local browser/client issue. Multiple or all users affected → likely a configuration issue, system availability problem, or data issue.',
          'Check for recent changes: was there a transport (SAP), deployment (D365), or configuration change made recently? Most ERP incidents follow a change. Review the change management log for the past 24–48 hours.',
          'Review application logs: SAP ECC — SLG1 (Application Log), filtered by object and date; SAP S/4HANA Cloud — Application Logs app; D365 Finance — Event Viewer on application server + LCS monitoring; Oracle Fusion — Enterprise Scheduler logs; Business Central — Telemetry in Azure App Insights.',
          'Attempt to reproduce in QA/test system: if the issue can be reproduced in a non-production system, testing a fix is safer and faster. If it cannot be reproduced, collect more data from production (timestamps, user IDs, document numbers).',
          'Check vendor service status page: for cloud ERP (S/4HANA Cloud, D365 Finance cloud, NetSuite), check the vendor trust/status page before spending hours debugging a platform outage — SAP: trust.sap.com; Microsoft: status.azure.com; Oracle: status.oracle.com',
          'Escalate to vendor support when: standard configuration is correct, logs show no obvious cause, issue is reproducible in a clean test system, and no recent changes were made. Provide: exact error message, reproduction steps, system version, and application log export.',
        ],
      },
      {
        heading: 'SAP-Specific Troubleshooting',
        items: [
          { label: 'Authorization check — SU53', path: 'After a user gets an authorization error, they immediately run SU53 (Display Authorization Check) — it shows the last failed authorization object, field values checked, and what the user has vs what is required. Compare to a working user\'s profile using SU01 → Profiles tab' },
          { label: 'Application Log — SLG1', path: 'Transaction SLG1 → filter by Object (e.g., FI, MM, SD, IDOC), Sub-object, and date/time range → select relevant log entries → shows detailed message texts including which data caused the error' },
          { label: 'Background Jobs — SM37 (ECC) / Application Jobs (Cloud)', path: 'SM37: filter by job name pattern (use * wildcard), status (active/finished/cancelled/aborted), date range. Click on aborted job → Spool (output) or Job log for error details. Cloud: search "Application Jobs" app in Fiori launchpad' },
          { label: 'IDoc Monitoring — WE02 / WE05', path: 'WE02: display IDocs with filter on direction (inbound/outbound), message type, status (51=error, 53=success, 64=ready to transfer). Select error IDoc → click Segments to see data → Edit → reprocess after fixing root cause' },
          { label: 'Workflow — SWIA (stuck work items)', path: 'Transaction SWIA → filter by task type and date → find items in ERROR or READY status → select → Execute → Forward to another user or Restart after error. Check agent assignment using SWIA → Environment → Possible Agents' },
          { label: 'Number Range Buffer — SNRO', path: 'If users report gaps in document numbers or number range errors: SNRO → enter number range object (e.g., RF_BELEG for FI documents) → check intervals and buffering settings. Number range buffers cause gaps when application servers are restarted — expected behavior' },
          { label: 'ABAP Dumps — ST22 (ECC)', path: 'Transaction ST22 → lists recent ABAP runtime errors (dumps) with timestamp, program, error type, user. Short dump gives exact line of code that failed. Look for SYNTAX_ERROR (program error after transport), NO_AUTHORITY (auth check in code), or DBIF_RSQL_INVALID_REQUEST (DB error). Save dump for developer analysis' },
        ],
      },
      {
        heading: 'Integration Troubleshooting Framework',
        steps: [
          'Step 1 — Identify which integration is failing: check middleware monitoring dashboard (SAP CPI/PI monitoring, MuleSoft Operations Center, Azure Integration Services monitor, Dell Boomi Atom Management). Look for failed message alerts, error rate spikes, or queues backing up.',
          'Step 2 — Verify source system sent the message: check the outbound interface log on the source system (SAP: WE02 for IDocs, SM58 for tRFC/qRFC; D365: Data Management job history; custom apps: application log). If nothing was sent, the trigger condition or output configuration may be wrong.',
          'Step 3 — Check middleware for processing errors: open the failed message in middleware — look for transform/mapping errors (field not found, data type mismatch), connection errors (timeout, refused connection), or authentication errors (401/403). The error message usually points to exactly what failed.',
          'Step 4 — Verify target system received and processed: check the target system\'s inbound interface log or API call log. Was the payload received? Did the target system return an error? This step distinguishes a middleware failure from a target system rejection.',
          'Step 5 — Test connectivity manually: use Postman or curl to call the target API endpoint with the same credentials the integration uses. This confirms whether the issue is connectivity/auth (applies to all messages) or data-specific (applies only to some messages).',
          'Step 6 — Check credentials and certificates: API keys, OAuth tokens, and SSL certificates expire. Verify the credentials used by the integration are current. In middleware, check the security artifact (keystore/credential) expiry date. Certificate expiry is a common cause of sudden integration failures with no code change.',
          'Step 7 — Verify firewall and network rules: if a new environment was provisioned or IP ranges changed, firewall rules may block the integration. Request the network team to verify that the source IP can reach the target host on the required port. Use telnet or Test-NetConnection to check.',
          'Step 8 — Escalate to integration developer: if all above checks pass and the issue is in the iFlow logic, XSLT transform, or custom mapping script, escalate to the integration developer with: the failed message payload (sanitized), exact error message from middleware, and timestamp of failure for log correlation.',
        ],
      },
    ],
  },
  {
    id: 'nosql-modern',
    title: 'NoSQL & Modern Database Patterns',
    icon: '⚡',
    color: 'green',
    sections: [
      {
        heading: 'Overview',
        content:
          'NoSQL databases emerged to address limitations of relational databases at web scale: flexible schemas for rapidly evolving data models, horizontal scaling across commodity hardware, optimized data structures for specific query patterns, and high write throughput for distributed workloads. NoSQL is not a replacement for RDBMS — it is a different tool for different problems. An RDBMS remains the best choice for transactional data requiring ACID guarantees and complex joins. The right database depends on your data model (document vs tabular vs graph), query patterns (point lookup vs full-text vs range), consistency requirements (strong vs eventual), and scale (gigabytes vs petabytes).',
      },
      {
        heading: 'NoSQL Types & Use Cases',
        items: [
          { label: 'Document Store (MongoDB, CouchDB, Firestore)', path: 'Stores JSON/BSON documents with flexible schema — different documents in the same collection can have different fields. Query on any field. Best for: product catalogs, user profiles, content management, e-commerce. Avoid for: data requiring complex joins across many document types — embed related data instead' },
          { label: 'Key-Value (Redis, DynamoDB, etcd)', path: 'Simplest model: get/set/delete by key. Extremely fast (sub-millisecond at scale). Best for: session storage, caching (read-through/write-through), leaderboards (sorted sets in Redis), distributed locking, rate limiting, feature flags. DynamoDB adds secondary indexes for richer query patterns' },
          { label: 'Wide-Column / Column-Family (Cassandra, HBase, Google BigTable)', path: 'Rows with dynamic columns; physically stores data column-by-column (efficient for partial row reads); optimized for high write throughput and time-series append patterns. Best for: IoT sensor data, time-series events, click-stream analytics, write-heavy workloads at massive scale. Model queries first — design tables around query patterns' },
          { label: 'Graph (Neo4j, Amazon Neptune, TigerGraph)', path: 'Data modeled as nodes (entities) and edges (relationships) with properties on both. Traversal queries (find all friends of friends, shortest path, connected components) are orders of magnitude faster than equivalent SQL recursive CTEs. Best for: social networks, recommendation engines, fraud detection, network topology, knowledge graphs' },
          { label: 'Search Engine (Elasticsearch, OpenSearch)', path: 'Inverted index optimized for full-text search, fuzzy matching, faceted filtering, and aggregations. Core of the ELK/EFK stack (Elasticsearch/OpenSearch + Logstash/Fluentd + Kibana). Best for: log analytics, application search, e-commerce product search. Not a primary data store — keep source of truth in RDBMS, sync to Elasticsearch for search' },
          { label: 'Time-Series (InfluxDB, TimescaleDB, Prometheus)', path: 'Optimized for append-only writes of timestamped metrics; built-in downsampling/aggregation; automatic data retention policies. Best for: infrastructure metrics, IoT sensor readings, financial tick data, application performance monitoring. TimescaleDB extends PostgreSQL so standard SQL works on time-series data' },
        ],
      },
      {
        heading: 'Redis Quick Reference',
        steps: [
          'Health and connection: redis-cli PING → PONG confirms connectivity; redis-cli -h hostname -p 6379 -a password for remote connection; INFO server for version and uptime; INFO stats for operations per second; INFO memory for memory usage',
          'String operations: SET user:1001 "John Doe" EX 3600 (set with 1-hour TTL); GET user:1001; DEL user:1001; INCR counter:page_views; INCRBY counter:page_views 10; SETNX lock:resource 1 (set if not exists — distributed lock pattern)',
          'Hash (object/map): HSET user:1001 name "John" age 30 email "john@example.com"; HGET user:1001 name; HGETALL user:1001; HDEL user:1001 email; HMSET for multiple fields; HKEYS user:1001',
          'List (queue/stack): RPUSH queue:jobs "job1" "job2" (append to tail); LPUSH (prepend to head); LPOP (dequeue from head — FIFO); RPOP (pop from tail — LIFO/stack); LRANGE queue:jobs 0 -1 (all elements); LLEN queue:jobs (length)',
          'Set and Sorted Set: SADD active:users "user:1001" "user:1002"; SMEMBERS active:users; SISMEMBER active:users "user:1001"; SCARD active:users (count). Sorted Set: ZADD leaderboard 1500 "playerA" 2200 "playerB"; ZRANGE leaderboard 0 -1 WITHSCORES REV (top scores first); ZSCORE leaderboard "playerA"',
          'Pub/Sub messaging: SUBSCRIBE channel:notifications (blocks, receives messages); PUBLISH channel:notifications "event_data"; PSUBSCRIBE channel:* (pattern subscribe); for reliable messaging prefer Redis Streams (XADD/XREAD) over basic pub/sub',
          'Diagnostics and persistence: TTL keyname (remaining seconds; -1 = no expiry; -2 = does not exist); KEYS user:* (returns matching keys — AVOID in production, use SCAN instead); SCAN 0 MATCH user:* COUNT 100 (cursor-based non-blocking scan); CONFIG GET maxmemory; CONFIG SET maxmemory-policy allkeys-lru; BGSAVE triggers RDB snapshot; CONFIG GET appendonly checks AOF status',
        ],
      },
      {
        heading: 'MongoDB Quick Reference',
        steps: [
          'Basic queries: db.orders.find({status: "pending"}) basic equality filter; db.orders.find({amount: {$gt: 100, $lte: 500}}) comparison operators ($gt, $gte, $lt, $lte, $ne, $in, $nin); db.orders.find({$or: [{status: "pending"}, {priority: "high"}]}) logical operators',
          'Projection (return specific fields): db.users.find({active: true}, {name: 1, email: 1, _id: 0}) — 1 includes field, 0 excludes; avoid SELECT * equivalent by always projecting only needed fields',
          'Insert and update: db.orders.insertOne({customer: "CUST001", amount: 250.00, status: "new", createdAt: new Date()}); db.orders.insertMany([{...}, {...}]); db.orders.updateOne({_id: ObjectId("...")}, {$set: {status: "shipped"}, $currentDate: {updatedAt: true}}); db.orders.updateMany({status: "pending"}, {$set: {flagged: true}})',
          'Delete: db.orders.deleteOne({_id: ObjectId("...")}); db.orders.deleteMany({status: "cancelled", createdAt: {$lt: new Date("2023-01-01")}}); — always test with find() first before deleteMany to confirm the filter',
          'Aggregation pipeline: db.orders.aggregate([{$match: {status: "completed"}}, {$group: {_id: "$customer_id", total: {$sum: "$amount"}, count: {$sum: 1}}}, {$sort: {total: -1}}, {$limit: 10}]) — pipeline stages: $match, $group, $project, $sort, $limit, $skip, $lookup (join), $unwind (flatten array), $addFields',
          '$lookup (join): db.orders.aggregate([{$lookup: {from: "customers", localField: "customer_id", foreignField: "_id", as: "customer_info"}}, {$unwind: "$customer_info"}]) — join orders to customers collection',
          'Indexes: db.orders.createIndex({customer_id: 1}) single field; db.orders.createIndex({status: 1, createdAt: -1}) compound (order matters — matches queries filtering on status + sorting by createdAt); db.orders.createIndex({customer_id: 1}, {background: true}) non-blocking build; db.orders.explain("executionStats").find({status: "pending"}) for query plan',
          'Backup and restore: mongodump --uri="mongodb://user:pass@host:27017/mydb" --out=/backup/$(date +%Y%m%d); mongorestore --uri="mongodb://user:pass@host:27017" --nsInclude="mydb.*" /backup/20240101; for Atlas (cloud MongoDB): use Atlas continuous backup or scheduled snapshots',
        ],
      },
      {
        heading: 'Database Selection Guide',
        steps: [
          'Need ACID transactions across multiple entity types with complex joins → use a relational RDBMS: PostgreSQL (open-source, feature-rich, JSON support, best default choice), SQL Server (Windows/Azure shop, strong tooling), MySQL (high read traffic, web apps), Oracle (enterprise, existing investment)',
          'Need flexible or evolving schema, nested document storage, or query by any field → MongoDB; if you are already on Google Cloud → Firestore; if you need real-time sync to client apps → Firestore or Firebase Realtime DB',
          'Need sub-millisecond caching, session storage, or distributed coordination → Redis; Redis Cluster for horizontal scaling; Redis Sentinel for high availability without clustering',
          'Need to store and query time-series metrics (infrastructure monitoring, IoT, financial ticks) → InfluxDB (purpose-built, Flux query language) or TimescaleDB (PostgreSQL extension — use standard SQL on time-series data); for Prometheus metrics specifically, use Prometheus + Thanos/Mimir for long-term storage',
          'Need full-text search, log analytics, or faceted search → Elasticsearch or OpenSearch (Apache 2.0 fork); use as a secondary search index alongside your RDBMS primary store; managed options: Elastic Cloud, Amazon OpenSearch Service',
          'Need to traverse relationships or model highly connected data → Neo4j (mature, Cypher query language) or Amazon Neptune (managed, supports Gremlin and SPARQL); use cases: fraud detection ring analysis, recommendation engines, knowledge graphs',
          'Need massive write throughput at scale (millions of writes/sec, multi-region) → Apache Cassandra or ScyllaDB (Cassandra-compatible, written in C++ — lower latency); design data model around query patterns first; accept eventual consistency',
          'Need both OLTP (transactional operations) and OLAP (analytics) on same data → consider HTAP databases: TiDB (MySQL-compatible), CockroachDB (PostgreSQL-compatible), or maintain separate OLAP warehouse (Snowflake, Google BigQuery, Amazon Redshift, Azure Synapse) with ETL/CDC pipeline from OLTP source',
        ],
      },
    ],
  },
]

export default function DBMSERPPage() {
  return (
    <>
      <TopBar
        title="DBMS, ERP & Problem Solving"
        subtitle="Database management, SQL reference, ERP systems, data troubleshooting and IT problem solving methodology"
      />
      <div className="flex-1 p-6 grid-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <DocSection sections={DBMS_ERP_DOCS} />
        </div>
      </div>
    </>
  )
}
