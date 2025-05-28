module.exports = {
   // Access Token 配置
  jwtSecretKey: 'smart task secret key',
  accessTokenExpiresIn: '1h',

  // Refresh Token 配置
  refreshTokenExpiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 天（以 ms 为单位）
  refreshTokenCookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',         // 生产环境建议启用
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  },

    // 邮箱发送
    emailUser: '2926978724@qq.com',
    emailPass: 'ospkpwnofrtddefh'
}
