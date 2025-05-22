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