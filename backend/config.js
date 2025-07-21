module.exports = {
   // Access Token 配置
  jwtSecretKey: 'smart task secret key',
  accessTokenExpiresIn: '1h',

  // Refresh Token 配置
  refreshTokenExpiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 天（以 ms 为单位）
  refreshTokenCookieOptions: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    domain: 'localhost', // 明确指定域名
    path: '/', // 明确路径
    maxAge: 7 * 24 * 60 * 60 * 1000
  },

    // 邮箱发送
    emailUser: '2926978724@qq.com',
    emailPass: 'ospkpwnofrtddefh',

    // openai密钥
    OPENAI_API_KEY: 'fk234227-w6AuHSOkXztt6W0GoteMGuVnqsegrmt6'
}
