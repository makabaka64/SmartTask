const db = require('../db/index')
const bcrypt = require('bcryptjs')

// 获取用户信息
exports.getUserInfo = (req, res) => {
    const sql = 'select id, email, nickname, avater_url, create_time from user where id=?'
    db.query(sql, req.user.id, (err, results) => {
        if (err) return res.cc(err)
        if (results.length !== 1) return res.cc('获取用户信息失败')
        res.send({
            status: 0,
            message: '获取用户信息成功',
            data: results[0],
        })
    })
}

// 更新用户信息
exports.updateUserInfo = (req, res) => {
    const sql = 'update user set ? where id=?'
    db.query(sql, [req.body, req.user.id], (err, results) => {
        if (err) return res.cc(err)
        if (results.affectedRows !== 1) return res.cc('更新用户信息失败')
        res.send({
            status: 0,
            message: '更新用户信息成功',
        })
    })
}

// 更新用户密码
exports.updateUserPwd = (req, res) => {
    const sql = 'select * from user where id=?'
    db.query(sql, req.user.id, (err, results) => {
        if (err) return res.cc(err)
        if (results.length !== 1) return res.cc('用户不存在')
        const compareResult = bcrypt.compareSync(req.body.oldPwd, results[0].password)
        if (!compareResult) return res.cc('旧密码错误')
        const newPwd = bcrypt.hashSync(req.body.newPwd, 10)
        const sqlUpdate = 'update user set password=? where id=?'
        db.query(sqlUpdate, [newPwd, req.user.id], (err2, results2) => {
            if (err2) return res.cc(err2)
            if (results2.affectedRows !== 1) return res.cc('更新密码失败')
            res.send({
                status: 0,
                message: '更新密码成功',
            })
        })
    })
}

// 更新用户头像
exports.updateUserAvatar = (req, res) => {
    const sql = 'update user set avater_url=? where id=?'
    db.query(sql, [req.body.avatar, req.user.id], (err, results) => {
        if (err) return res.cc(err)
        if (results.affectedRows !== 1) return res.cc('更新头像失败')
        res.send({
            status: 0,
            message: '更新头像成功',
        })  
    })
}