const express = require('express')
const app = express()
const cors = require('cors')
const joi = require('joi');
const config = require('./config'); 
const jwt = require('jsonwebtoken')
const expressJWT = require('express-jwt')


app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: false }))
app.use(expressJWT({ secret: config.jwtSecretKey }).unless({ path: [/^\/api\//] }))

// 路由之前，封装 res.cc 函数
app.use((req, res, next) => {
    res.cc = function (err, status = 1) {
        res.send({
            status,
            message: err instanceof Error ? err.message : err,
        })
    }
    next()
})


// 导入并注册用户路由模块
const userRouter = require('./router/user')
app.use('/api', userRouter)
// 用户信息
const userinfoRouter = require('./router/userinfo')
app.use('/my', userinfoRouter)

// 定义错误级别的中间件
app.use((err, req, res, next) => {
    // 验证失败导致的错误
    if (err instanceof joi.ValidationError) return res.cc(err)
    // 身份认证失败后的错误
    if (err.name === 'UnauthorizedError') return res.cc('身份认证失败！')
    // 未知的错误
    return res.cc(err)
})
app.listen(3001, function () {
  console.log('api server running at http://127.0.0.1:3001')
})