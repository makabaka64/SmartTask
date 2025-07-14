const express = require('express')
const app = express()
const cors = require('cors')
const joi = require('joi');
const config = require('./config'); 
const expressJWT = require('express-jwt')
const cookieParser = require('cookie-parser')
const http = require('http')
const server = http.createServer(app);

app.use(cookieParser())  // 注册解析 Cookie 的中间件
app.use(cors({
    origin: 'http://localhost:5173', // 前端实际运行地址
    credentials: true,               // 允许携带 cookie
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie'] // 允许客户端读取set-cookie头
  }))
app.use(express.json()) 
app.use(express.urlencoded({ extended: false })) 

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
app.use(expressJWT({
    secret: config.jwtSecretKey,
    algorithms: ['HS256'] 
  }).unless({
    path: [/^\/api\//] 
  }))
// 导入并注册用户路由模块
const userRouter = require('./router/user')
app.use('/api', userRouter)
// 用户信息
const userinfoRouter = require('./router/userinfo')
app.use('/my', userinfoRouter)
const taskRouter = require('./router/task');
app.use('/task', taskRouter);

// 定义错误级别的中间件
app.use((err, req, res, next) => {
    // 如果 res.cc 没挂载，临时挂一个
    if (typeof res.cc !== 'function') {
        res.cc = function (err, status = 1) {
            res.send({
                status,
                message: err instanceof Error ? err.message : err
            });
        };
    }
    // 验证失败导致的错误
    if (err instanceof joi.ValidationError) return res.cc(err)
    // 身份认证失败后的错误
    if (err.name === 'UnauthorizedError') {
        return res.status(401).send({
            status: 1,
            message: '身份认证失败！'
          })
    }
    // 未知的错误
    return res.cc(err)
})
app.listen(3001, function () {
  console.log('api server running at http://localhost:3001')
})