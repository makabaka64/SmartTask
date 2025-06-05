// scripts/initRolesAndPermissions.js
const mysql = require('mysql2/promise')

// 配置连接参数
const dbConfig = {
  host: '127.0.0.1',
  user: 'root',
  password: '123456',
  database: 'smarttask',
}

const roles = [
  { name: 'admin', description: '任务管理员' },
  { name: 'user', description: '普通成员' },
  { name: 'Participant', description: '参与者' }
]

const permissions = [
  { name: 'create_task', description: '创建任务' },
  { name: 'edit_task', description: '编辑任务' },
  { name: 'delete_task', description: '删除任务' },
  { name: 'view_task', description: '查看任务' },
  { name: 'member_manage', description: '管理成员' }
]

const rolePermissionMap = {
  admin: ['create_task', 'edit_task', 'delete_task', 'view_task', 'member_manage'],
  Participant:['view_task', 'edit_task'],
  user: ['view_task'],
}

async function initRolesAndPermissions() {
  const connection = await mysql.createConnection(dbConfig)

  try {
    // 插入角色
    for (const role of roles) {
      await connection.execute(
        'INSERT IGNORE INTO role (name, description) VALUES (?, ?)',
        [role.name, role.description]
      )
    }

    // 插入权限
    for (const permission of permissions) {
      await connection.execute(
        'INSERT IGNORE INTO permission (name, description) VALUES (?, ?)',
        [permission.name, permission.description]
      )
    }

    // 角色分配权限
    for (const [roleName, perms] of Object.entries(rolePermissionMap)) {
      const [roleRows] = await connection.execute(
        'SELECT id FROM role WHERE name=?',
        [roleName]
      )
      const roleId = roleRows[0]?.id
      if (!roleId) continue

      for (const permName of perms) {
        const [permRows] = await connection.execute(
          'SELECT id FROM permission WHERE name=?',
          [permName]
        )
        const permId = permRows[0]?.id
        if (!permId) continue

        await connection.execute(
          'INSERT IGNORE INTO role_permission (role_id, permission_id) VALUES (?, ?)',
          [roleId, permId]
        )
      }
    }

    console.log('✅ 初始化角色和权限完成')
  } catch (err) {
    console.error('❌ 初始化失败:', err)
  } finally {
    await connection.end()
  }
}

initRolesAndPermissions()
