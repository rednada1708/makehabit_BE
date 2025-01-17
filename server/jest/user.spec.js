//app.js와 같은 레벨에 있어야함
//supertest로 app.js 가짜 실행
//실제 서버가 아닌 실행하는 척만 하므로 server.js 는 불러올필요 없음
//app.js가 http서버면 supertest사용 가능
const app = require('../app');
const supertest = require('supertest');
const mongoose = require('mongoose');
const userCtl = require('../controller/user');

jest.mock('../models');
const User = require('../models/user');
const Character = require('../models/character');

jest.mock('../middlewares/auth-middleware');
let authMiddleware = require('../middlewares/auth-middleware');

//===============회원가입======================
describe('회원가입', () => {
    beforeEach(() => {
        User.findOne = jest.fn((item) => {
            const mockedSave = jest.fn();
            return { exec: () => {} };
        });
        User.prototype.save = jest.fn();
        Character.create = jest.fn();
    });
    test('조건에 맞는 입력 시 회원가입 성공', async () => {
        const res = await supertest(app)
            .post('/api/users/signup')
            .set('Accept', 'application/json')
            .send({
                email: 'aabg1g011578@naver.com',
                nickname: 'db1wn1gus',
                password: 'wngus4582*',
                confirmPassword: 'wngus4582*',
            });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('회원가입이 완료되었습니다!');
        expect(User.prototype.save.mock.calls.length).toBe(1);
    });

    test('유효하지 않은 이메일 입력시 회원가입 실패', async () => {
        const emailInvalid = await supertest(app)
            .post('/api/users/signup')
            .set('Accept', 'application/json')
            .send({
                email: 'aabg1g011578naver.com',
                nickname: 'db1wn1gus',
                password: 'wngus4582*',
                confirmPassword: 'wngus4582*',
            });
        expect(emailInvalid.status).toBe(400);
        expect(emailInvalid.body.message).toBe('이메일 형식을 확인해주세요.');
    });

    test('유효하지 않은 닉네임 입력시 회원가입 실패', async () => {
        const nicknameInvalid = await supertest(app)
            .post('/api/users/signup')
            .set('Accept', 'application/json')
            .send({
                email: 'aabg1g011578@naver.com',
                nickname: 'db1wn1!gus',
                password: 'wngus4582*',
                confirmPassword: 'wngus4582*',
            });

        expect(nicknameInvalid.status).toBe(400);
        expect(nicknameInvalid.body.message).toBe(
            '닉네임은 3자 이상, 15자 이하의 영어,한글,숫자로만 구성되어야 합니다.'
        );
    });

    test('유효하지 않은 비밀번호 입력 시 회원가입 실패', async () => {
        const passwordInvalid = await supertest(app)
            .post('/api/users/signup')
            .set('Accept', 'application/json')
            .send({
                email: 'aabg1g011578@naver.com',
                nickname: 'db1wn1gus',
                password: 'wngus4582',
                confirmPassword: 'wngus4582',
            });

        expect(passwordInvalid.status).toBe(400);
        expect(passwordInvalid.body.message).toBe(
            '비밀번호는 8자 이상, 16자 이하로 구성되며, 문자와 숫자 및 특수 문자가 모두 포함 되어야 합니다.'
        );
    });
    test('비밀번호와 비밀번호 확인이 일치하지 않다면 회원가입 실패', async () => {
        const passwordDup = await supertest(app)
            .post('/api/users/signup')
            .set('Accept', 'application/json')
            .send({
                email: 'aabg1g011578@naver.com',
                nickname: 'db1wn1gus',
                password: 'wngus4582*',
                confirmPassword: 'wngus4582!',
            });

        expect(passwordDup.status).toBe(400);
        expect(passwordDup.body.message).toBe('비밀번호가 일치하지 않습니다.');
    });
});

//===============로그인======================
describe('로그인', () => {
    beforeEach(() => {
        User.findOne = jest.fn(() => {
            return {
                exec: () => {
                    return {
                        password: '$2b$10$.YDhBWwVf2XRsImP1rVR6uco6xaEd6aTO0gSF/zWnBcKdaJgMa5MO',
                    };
                },
            };
        });
    });
    test('조건에 맞는 입력 시 로그인 성공 및 토큰과 닉네임 반환', async () => {
        const res = await supertest(app)
            .post('/api/users/login')
            .set('Accept', 'application/json')
            .send({
                email: 'bgg01578@naver.com',
                password: 'wngus4582*',
            });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('로그인 되었습니다.');
    });
});

afterAll(() => {
    mongoose.connection.close();
});
