const db = require('../db/index')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config')
// 验证码的发送
const nodemailer = require("nodemailer");

// 简单内存存储验证码
const codeCache = new Map()
// 随机验证码
function randomCode() {
    return Math.random().toString().slice(-6)
  }

// 发送验证码的处理函数
exports.sendCode = async (req, res) => {
    const { email } = req.body
    if (!email) return res.cc('邮箱不能为空')
    console.log(email)
    // 1. 生成并缓存（5 分钟过期）
    const code = randomCode()
    codeCache.set(email, { code, expire: Date.now() + 5 * 60 * 1000 })
  
    // 2. 发送邮件
    const transporter = nodemailer.createTransport({
      host: "smtp.qq.com",
      port: 465,
      secure: true,
      auth: { user: config.emailUser, pass: config.emailPass }
    })
    try {
      await transporter.sendMail({
        from: config.emailUser,
        to: email,
        subject: "【SmartTask】邮箱验证码",
        html: `
          <p>您好！</p>
          <p>您正在注册 SmartTask，验证码：<strong>${code}</strong></p>
          <p>5 分钟内有效。</p>
        `
      })
      res.send({ status: 0, message: '验证码已发送，请注意查收' })
    } catch (err) {
      console.error(err)
      res.cc('验证码发送失败')
    }
  }

// 注册用户的处理函数
exports.regUser = (req, res) => {
    console.log('reg body:', req.body)
    const { email, password, verificationCode } = req.body
    if (!email || !password || !verificationCode) {
      return res.cc('邮箱、密码和验证码均不能为空')
    }
  
    // 验证码校验
    const cache = codeCache.get(email)
    if (!cache) return res.cc('请先获取验证码')
    if (Date.now() > cache.expire) {
      codeCache.delete(email)
      return res.cc('验证码已过期，请重新获取')
    }
    if (verificationCode !== cache.code) {
      return res.cc('验证码不正确')
    }
    // 校验通过后删除缓存
    codeCache.delete(email)
  
    // 检查邮箱是否已注册
    const sqlCheck = 'SELECT id FROM user WHERE email = ?'
    db.query(sqlCheck, email, (err, results) => {
      if (err) return res.cc(err)
      if (results.length > 0) return res.cc('邮箱已被注册')
  
      // 写入用户
      const hashed = bcrypt.hashSync(password, 10)
      const sqlInsert = 'INSERT INTO user (email, password, nickname) VALUES (?, ?, ?)'
      const nickname = '用户_' + Math.random().toString(36).substr(2, 6)
      db.query(sqlInsert, [email, hashed, nickname], (err2, result2) => {
        if (err2) return res.cc(err2)
        if (result2.affectedRows !== 1) return res.cc('注册失败，请重试')
        res.send({ status: 0, message: '注册成功' })
      })
    })
  }
  
  
  // 登录的处理函数
  exports.login = (req, res) => {
    const userInfo = req.body
    if (!userInfo.email || !userInfo.password) {
        return res.cc('邮件或密码不能为空')
    }
    const sql = 'select * from user where email=?'
    db.query(sql, userInfo.email, (err, results) => {
        if (err) {
            return res.cc(err)
        }
        if (results.length !== 1) {
            return res.cc('用户不存在')
        }
        const compareResult = bcrypt.compareSync(userInfo.password, results[0].password)
        if (!compareResult) {
            return res.cc('密码错误')
        }
        const user = { ...results[0], password: '',  avater_url: '' }
        const tokenStr = jwt.sign(user, config.jwtSecretKey, { expiresIn: config.expiresIn })
        res.send({
            status: 0,
            message: '登录成功！',
            token: 'Bearer ' + tokenStr,
        })
    })
  }