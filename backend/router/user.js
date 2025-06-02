const express = require('express')
const router = express.Router()

// 导入用户路由处理函数模块
const user_handler = require('../router_handler/user')
// 1. 导入验证数据的中间件
const expressJoi = require('@escook/express-joi')
// 2. 导入需要的验证规则对象
const { reg_schema, login_schema } = require('../schema/user')

// 发送验证码
router.post('/sendcode', user_handler.sendCode)
// 注册新用户
router.post('/reguser', expressJoi(reg_schema), user_handler.regUser)
// 登录
router.post('/login', expressJoi(login_schema), user_handler.login)
// 退出登录
router.post('/logout', user_handler.logout)
// token刷新
router.post('/refresh', user_handler.refreshToken)

module.exports = router