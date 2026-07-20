const express = require('express');
const cors = require('cors');
const joi = require('joi');
const config = require('./config');
const expressJWT = require('express-jwt');
const cookieParser = require('cookie-parser');

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  res.cc = function cc(err, status = 1) {
    res.send({
      status,
      message: err instanceof Error ? err.message : err
    });
  };
  next();
});

app.use(
  expressJWT({
    secret: config.jwtSecretKey,
    algorithms: ['HS256']
  }).unless({
    path: [/^\/api\//]
  })
);

const userRouter = require('./router/user');
const userinfoRouter = require('./router/userinfo');
const taskRouter = require('./router/task');
const summaryRouter = require('./router/summary');
const agentRouter = require('./router/agent');
const knowledgeRouter = require('./router/knowledge');

app.use('/api', userRouter);
app.use('/my', userinfoRouter);
app.use('/task', taskRouter);
app.use('/api', summaryRouter);
app.use('/agent', agentRouter);
app.use('/knowledge', knowledgeRouter);

app.use((err, req, res, next) => {
  if (typeof res.cc !== 'function') {
    res.cc = function cc(fallbackErr, status = 1) {
      res.send({
        status,
        message: fallbackErr instanceof Error ? fallbackErr.message : fallbackErr
      });
    };
  }

  if (err instanceof joi.ValidationError) return res.cc(err);
  if (err.name === 'UnauthorizedError') {
    return res.status(401).send({
      status: 1,
      message: '身份认证失败'
    });
  }

  return res.cc(err);
});

require('./reminder');

app.listen(3001, () => {
  console.log('api server running at http://localhost:3001');
});
