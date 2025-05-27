const joi = require('joi')

const email = joi
    .string()
    .email()
    .required()
const password = joi
    .string()
    .pattern(/^[\S]{6,12}$/)
    .required()
    const verificationCode = joi.string().required()
    const nickname = joi.string().required()
    const avater_url = joi.string().dataUri().required()
    const id = joi.number().integer().min(1).required()


    exports.reg_schema = {
        body: {
            email,
            password,
            verificationCode
        }, 
    }
    exports.login_schema = {
        body:  {
            email,
            password
        }
    }
    // 更新用户信息
    exports.update_userinfo_schema = {
        body: {
            id,
            nickname,
        },
    }
    // 更新用户密码
    exports.update_password_schema = {
        body: {
            oldPwd: password,
            newPwd: joi.not(joi.ref('oldPwd')).concat(password),
        },
    }
    // 更新用户头像
    exports.update_avatar_schema = {
        body: {
            avater_url
        }
    }