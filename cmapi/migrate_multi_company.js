/**
 * Migration Script: Multi-Company System
 * สร้างตาราง companies, company_users และ migrate ข้อมูลเดิม
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('✅ Connected to database:', process.env.DB_NAME);

  try {
    await connection.beginTransaction();

    // =============================================
    // 1. สร้างตาราง companies
    // =============================================
    console.log('\n📦 Creating table: companies...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        company_id VARCHAR(36) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        company_logo VARCHAR(500) NULL,
        company_subtitle VARCHAR(255) NULL DEFAULT 'บริหารโครงการก่อสร้าง',
        company_color VARCHAR(7) DEFAULT '#dc2626',
        owner_user_id INT NULL,
        active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Table companies created');

    // =============================================
    // 2. สร้างตาราง company_users (Many-to-Many)
    // =============================================
    console.log('\n📦 Creating table: company_users...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS company_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id VARCHAR(36) NOT NULL,
        user_id INT NOT NULL,
        role ENUM('owner', 'admin', 'member') DEFAULT 'member',
        active TINYINT(1) DEFAULT 1,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE KEY unique_company_user (company_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Table company_users created');

    // =============================================
    // 3. เพิ่ม company_id ในตาราง projects
    // =============================================
    console.log('\n📦 Adding company_id to projects...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'company_id'
    `, [process.env.DB_NAME]);

    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE projects ADD COLUMN company_id VARCHAR(36) NULL
      `);
      await connection.execute(`
        ALTER TABLE projects ADD CONSTRAINT fk_projects_company 
        FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE SET NULL
      `);
      console.log('   ✅ Column company_id added to projects');
    } else {
      console.log('   ⏭️  Column company_id already exists in projects');
    }

    // =============================================
    // 4. สร้าง SPK Construction เป็นบริษัทแรก
    // =============================================
    console.log('\n📦 Creating default company: SPK Construction...');
    const defaultCompanyId = 'spk-default';
    
    const [existingCompany] = await connection.execute(
      'SELECT company_id FROM companies WHERE company_id = ?',
      [defaultCompanyId]
    );

    if (existingCompany.length === 0) {
      // หา admin user (owner)
      const [adminUsers] = await connection.execute(
        "SELECT user_id FROM users WHERE username IN ('admin', 'adminspk') AND active = 1 LIMIT 1"
      );
      const ownerUserId = adminUsers.length > 0 ? adminUsers[0].user_id : null;

      await connection.execute(`
        INSERT INTO companies (company_id, company_name, company_subtitle, company_color, owner_user_id)
        VALUES (?, 'SPK Construction', 'บริหารโครงการก่อสร้าง', '#dc2626', ?)
      `, [defaultCompanyId, ownerUserId]);
      console.log('   ✅ SPK Construction company created');
    } else {
      console.log('   ⏭️  SPK Construction already exists');
    }

    // =============================================
    // 5. ย้าย users ทั้งหมดเข้าบริษัท SPK
    // =============================================
    console.log('\n📦 Migrating users to SPK Construction...');
    const [activeUsers] = await connection.execute(
      'SELECT user_id, username FROM users WHERE active = 1'
    );

    let migratedCount = 0;
    for (const user of activeUsers) {
      const [existing] = await connection.execute(
        'SELECT id FROM company_users WHERE company_id = ? AND user_id = ?',
        [defaultCompanyId, user.user_id]
      );

      if (existing.length === 0) {
        // admin/adminspk → owner role
        const role = ['admin', 'adminspk'].includes(user.username) ? 'owner' : 'member';
        await connection.execute(
          'INSERT INTO company_users (company_id, user_id, role) VALUES (?, ?, ?)',
          [defaultCompanyId, user.user_id, role]
        );
        migratedCount++;
      }
    }
    console.log(`   ✅ Migrated ${migratedCount} users to SPK Construction`);

    // =============================================
    // 6. ผูก projects ทั้งหมดกับ SPK
    // =============================================
    console.log('\n📦 Linking projects to SPK Construction...');
    const [updateResult] = await connection.execute(
      'UPDATE projects SET company_id = ? WHERE company_id IS NULL',
      [defaultCompanyId]
    );
    console.log(`   ✅ Linked ${updateResult.affectedRows} projects to SPK Construction`);

    // =============================================
    // 7. สร้าง indexes เพิ่มเติม
    // =============================================
    console.log('\n📦 Creating additional indexes...');
    try {
      await connection.execute('CREATE INDEX idx_projects_company ON projects (company_id)');
      console.log('   ✅ Index idx_projects_company created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('   ⏭️  Index idx_projects_company already exists');
      } else {
        throw e;
      }
    }

    try {
      await connection.execute('CREATE INDEX idx_company_users_user ON company_users (user_id)');
      console.log('   ✅ Index idx_company_users_user created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('   ⏭️  Index idx_company_users_user already exists');
      } else {
        throw e;
      }
    }

    await connection.commit();
    console.log('\n🎉 Migration completed successfully!');

    // Summary
    const [companiesCount] = await connection.execute('SELECT COUNT(*) as count FROM companies');
    const [companyUsersCount] = await connection.execute('SELECT COUNT(*) as count FROM company_users');
    const [projectsWithCompany] = await connection.execute('SELECT COUNT(*) as count FROM projects WHERE company_id IS NOT NULL');

    console.log('\n📊 Summary:');
    console.log(`   Companies: ${companiesCount[0].count}`);
    console.log(`   Company-User links: ${companyUsersCount[0].count}`);
    console.log(`   Projects with company: ${projectsWithCompany[0].count}`);

  } catch (error) {
    await connection.rollback();
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await connection.end();
    console.log('\n🔌 Database connection closed');
  }
}

migrate();
