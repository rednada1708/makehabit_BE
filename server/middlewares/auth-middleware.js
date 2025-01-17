const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = (req, res, next) => {
    // console.log(req.header);
    const { authorization } = req.headers;
    if (authorization === 'Bearer null' || authorization === undefined) {
        // console.log('req.headers.authorization 내용은 : ', authorization);
        res.locals.user = undefined;
        next();
        //res.status(400).json({ errorMessage: '로그인 후 사용하시오' });
        return;
    }

    const [tokenType, tokenValue] = authorization.split(' ');

    if (tokenType != 'Bearer') {
        res.status(401).send({
            message: '로그인 후 사용하시오',
        });
        return;
    }

    try {
        const { email } = jwt.verify(tokenValue, process.env.JWT_SECRET_KEY);

        User.findOne({ email })
            .exec()
            .then((user) => {
                res.locals.user = user;
                next();
            });
    } catch (error) {
        //jwt 토큰이 유효하지 않은 경우
        return res.status(401).send({
            user: null,
            message: '로그인 후 사용하시오',
        });
    }
};
