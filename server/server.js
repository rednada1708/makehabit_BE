const http = require('./app');
//require('./socket');

http.listen(3000, () => {
    console.log(3000, '포트로 서버가 켜졌습니다.');
});
