const Challenge = require('../models/challenge');
const User = require('../models/user');
const calc = require('../modules/calcProperty');
const moment = require('moment');
const sanitizeHtml = require('sanitize-html');
const Character = require('../models/character');
// 추천 API
async function recommendChallenge(req, res) {
    try {
        let userId;
        if (!res.locals.user) {
            userId = '';
        } else {
            userId = res.locals.user.userId;
        }

        const { length } = req.query;
        let challenges;
        let today = new Date(moment().format('YYYY-MM-DD')); //2022-03-05 00:00:00
        challenges = await Challenge.find({
            startAt: { $gte: new Date(moment(today).add(-9, 'hours')) },
        }).lean();

        calc.calcUserLikes(challenges);
        challenges = challenges.sort((a, b) => b.likeUsers - a.likeUsers);
        if (length) {
            challenges = challenges.slice(0, length);
        }
        calc.plusChallengeId(challenges);
        calc.calcParticipants(challenges);
        calc.calcPastDaysAndRound(challenges);
        calc.calcStatus(challenges);
        await calc.calcIsLike(challenges, userId);

        for (const i of challenges) {
            i.thumbnail = i.thumbnail.replace('origin', 'thumb');
        }

        res.status(200).json({ challenges });
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
}

//메인 - 검색기능 // isLike ++++++++++++++++++++++++++++++
async function searchChallenge(req, res) {
    try {
        let userId;
        if (!res.locals.user) {
            userId = '';
        } else {
            userId = res.locals.user.userId;
        }

        const { title } = req.query;
        let today = new Date(moment().format('YYYY-MM-DD')); //2022-03-05 00:00:00

        const existChallenges = await Challenge.find(
            {
                title: { $regex: `${title}` },
                startAt: { $gte: new Date(moment(today).add(-9, 'hours')) },
            },
            { _id: 1, category: 1, participants: 1, thumbnail: 1, title: 1, startAt: 1 }
        )
            .sort({ startAt: 1 })
            .lean(); // populate.._doc..
        calc.plusChallengeId(existChallenges);
        calc.calcParticipants(existChallenges);
        calc.calcPastDaysAndRound(existChallenges);
        calc.calcStatus(existChallenges);
        await calc.calcIsLike(existChallenges, userId);
        const challenges = existChallenges; //날짜 내림차순 으로 정리

        for (const i of challenges) {
            i.thumbnail = i.thumbnail.replace('origin', 'thumb');
        }
        res.status(200).json({ challenges });
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
}

// 카테고리 페이지 목록조회 // 걱정됐죠 ㅜ.ㅜ
async function getCategoryList(req, res) {
    try {
        let userId;
        if (!res.locals.user) {
            userId = '';
        } else {
            userId = res.locals.user.userId;
        }
        const { categoryId } = req.params;
        const { length } = req.query;
        let existChallenges;
        let today = new Date(moment().format('YYYY-MM-DD'));
        if (categoryId === 'all') {
            existChallenges = await Challenge.find(
                { startAt: { $gte: new Date(moment(today).add(-9, 'hours')) } },
                { _id: 1, category: 1, participants: 1, thumbnail: 1, title: 1, startAt: 1 }
            ) // projection으로 대체가능  질문..5개 가져오는 기준?!
                .sort({ startAt: 1 })
                .limit(length)
                .lean();
        } else if (categoryId === 'new') {
            existChallenges = await Challenge.find(
                {
                    startAt: {
                        $gte: new Date(moment(today).add(-9, 'hours')),
                        $lt: new Date(moment(today).add(7, 'days').add(15, 'hours')),
                    },
                },
                {
                    _id: 1,
                    category: 1,
                    participants: 1,
                    thumbnail: 1,
                    title: 1,
                    startAt: 1, //{ $gte: today_date }
                }
            )
                .sort({ startAt: 1 }) // projection으로 대체가능  질문..5개 가져오는 기준?!
                .limit(length)
                .lean();
        } else if (categoryId === 'popular') {
            const notSortedExistChallenges = await Challenge.find(
                { startAt: { $gte: new Date(moment(today).add(-9, 'hours')) } },
                { _id: 1, category: 1, participants: 1, thumbnail: 1, title: 1, startAt: 1 }
            )
                .sort({ startAt: 1 }) // projection으로 대체가능  질문..5개 가져오는 기준?!
                .limit(length)
                .lean();
            existChallenges = notSortedExistChallenges.sort(
                (a, b) => b.participants.length - a.participants.length
            );
        } else {
            existChallenges = await Challenge.find(
                {
                    category: categoryId,
                    startAt: { $gte: new Date(moment(today).add(-9, 'hours')) },
                },
                { _id: 1, category: 1, participants: 1, thumbnail: 1, title: 1, startAt: 1 }
            ) // projection으로 대체가능  질문..5개 가져오는 기준?!
                .sort({ startAt: 1 })
                .limit(length)
                .lean();
        }
        calc.plusChallengeId(existChallenges);
        calc.calcParticipants(existChallenges);
        calc.calcPastDaysAndRound(existChallenges);
        await calc.calcIsLike(existChallenges, userId);
        const challenges = existChallenges;

        for (const i of challenges) {
            i.thumbnail = i.thumbnail.replace('origin', 'thumb');
        }
        res.status(200).json({ challenges });
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
}
// 상세조회 API
async function getDetailChallenge(req, res) {
    try {
        const { challengeId } = req.params;
        let userId;
        if (!res.locals.user) {
            userId = '';
        } else {
            userId = res.locals.user.userId;
        }
        const challenge = await Challenge.findById(challengeId).lean();
        await calc.calcIsLike([challenge], userId);
        await calc.calcIsParticipate([challenge], userId);
        calc.calcParticipants([challenge]);
        calc.plusChallengeId([challenge]);
        calc.calcPastDaysAndRound([challenge]);
        calc.calcUploadStatus([challenge]);
        calc.calcChangeable([challenge], userId);
        if (!userId) {
            challenge.proofCount = 0;
            challenge.isUpload = false;
        } else {
            await calc.calcProofCnt([challenge], userId);
            await calc.calcUserIsUpload([challenge], userId);
        }
        res.status(200).send(challenge);
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
}

//챌린지 작성 API 기능 구현 완료
async function writeChallenge(req, res) {
    try {
        if (!res.locals.user) {
            res.status(401).json({
                message: '로그인 후 사용하시오',
            });
            return;
        }
        const { userId } = res.locals.user;
        const { title, content, category, thumbnail, startAt, howtoContent } = req.body;

        let toIsoTime = new Date(moment(startAt));
        let today = new Date().toDateString();
        let checkpoint = new Date(today);
        if (toIsoTime - checkpoint < 0) {
            res.status(400).send({
                message: '오늘 날짜 이전의 챌린지는 개설할 수 없습니다.',
            });
            return;
        }
        const existChallenges = await Challenge.find({
            madeBy: userId,
            createdAt: { $gte: checkpoint },
        });
        if (existChallenges.length >= 3) {
            res.status(400).send({
                errorMessage: '더 이상 챌린지를 개설할 수 없습니다.',
            });
            return;
        }
        const participants = [userId];
        const existUser = await User.findById(userId);
        const participate = existUser.participate;
        const createdChallenge = await Challenge.create({
            title: sanitizeHtml(title),
            content: sanitizeHtml(content),
            category,
            thumbnail,
            startAt: toIsoTime,
            howtoContent: sanitizeHtml(howtoContent),
            participants,
            madeBy: userId,
        });
        const challengeId = createdChallenge.challengeId;
        participate.push(challengeId);
        await User.updateOne({ _id: userId }, { $set: { participate } });
        const userCharacter = await Character.findOne({ userId: userId });
        let point = 100;
        userCharacter.characterCurrentPoint = userCharacter.characterCurrentPoint + point;
        await userCharacter.save();
        res.status(201).json({ message: '챌린지 작성이 완료되었습니다.', challengeId, point }); // created : 201
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
}

// 챌린지 수정 API
async function changeChallenge(req, res) {
    if (!res.locals.user) {
        res.status(401).json({
            message: '로그인 후 사용하시오',
        });
        return;
    }
    try {
        const { title, content, category, thumbnail, startAt, howtoContent } = req.body;
        let toIsoTime = new Date(moment(startAt));
        let today = new Date().toDateString();
        let checkpoint = new Date(today);
        if (toIsoTime - checkpoint <= 0) {
            res.status(400).json({
                message: '오늘 이후의 날짜로만 수정가능합니다.',
            });
            return;
        }
        const { userId } = res.locals.user;
        const { challengeId } = req.params;
        const challenge = await Challenge.findById(challengeId).lean();
        if (challenge) {
            calc.calcChangeable([challenge], userId);
            if (!challenge.isChangeable) {
                res.status(401).json({
                    message: '수정 불가능 합니다.',
                });
                return;
            }
            await Challenge.updateOne(
                { _id: challengeId },
                {
                    $set: {
                        title: sanitizeHtml(title),
                        content: sanitizeHtml(content),
                        category,
                        thumbnail,
                        howtoContent: sanitizeHtml(howtoContent),
                        startAt: toIsoTime,
                    },
                }
            );
        } else {
            res.status(401).json({
                message: '수정 불가능 합니다.',
            });
            return;
        }
        res.json({ message: '챌린지 수정완료', challengeId });
    } catch (err) {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
}

// 챌린지 참여하기 기능 구현 완료
async function joinChallenge(req, res) {
    //일단 challengeId로 조회해야함

    if (!res.locals.user) {
        res.status(401).json({
            message: '로그인 후 사용하시오',
        });
        return;
    }

    try {
        const { userId } = res.locals.user;
        const { challengeId } = req.params;
        // 이 부분은 챌린지 시작 전에만 참가할 수 있도록 수정한 부분입니다.
        const statusChallenge = await Challenge.findById(challengeId).lean();
        calc.calcStatus([statusChallenge]);
        if (statusChallenge.status !== 1) {
            res.status(400).json({
                message: '현재 참여할 수 없는 챌린지 입니다.',
            });
            return;
        }
        const existChallenge = await Challenge.findById(challengeId);
        const participants = existChallenge.participants;
        const existUser = await User.findById(userId);
        const participate = existUser.participate;
        if (!participants.includes(userId)) {
            participants.push(userId);
            await Challenge.updateOne({ _id: challengeId }, { $set: { participants } });
            if (!participate.includes(challengeId)) {
                participate.push(challengeId);
                await User.updateOne({ _id: userId }, { $set: { participate } });
            }
            res.status(201).json({ message: '참여성공' });
        } else {
            res.status(400).json({ message: '참여실패' });
        }
    } catch (err) {
        return res.status(400).json({ message: '잘못된 요청입니다.' });
    }
}

// 챌린지 참여취소 기능 구현 완료
async function joinCancelChallenge(req, res) {
    if (!res.locals.user) {
        res.status(401).send({
            message: '로그인 후 사용하시오',
        });
        return;
    }
    try {
        const { userId } = res.locals.user;
        const { challengeId } = req.params;

        // 이 부분은 챌린지 시작 전에만 참가할 수 있도록 수정한 부분입니다.
        const statusChallenge = await Challenge.findById(challengeId).lean();
        calc.calcStatus([statusChallenge]);
        if (statusChallenge.status !== 1) {
            res.status(400).json({
                message: '이미 챌린지가 시작되어 참가 취소할 수 없습니다.',
            });
            return;
        }
        const existChallenge = await Challenge.findById(challengeId);
        const participants = existChallenge.participants;
        const existUser = await User.findById(userId);
        const participate = existUser.participate;
        if (participants.includes(userId)) {
            participants.splice(participants.indexOf(userId), 1);
            await Challenge.updateOne({ _id: challengeId }, { $set: { participants } });
            if (participate.includes(challengeId)) {
                participate.splice(participate.indexOf(challengeId), 1);
                await User.updateOne({ _id: userId }, { $set: { participate } });
            }
            res.status(200).json({ message: '참여 취소 성공' });
        } else {
            res.status(400).json({ message: '참여 취소 실패' });
        }
    } catch (err) {
        return res.status(400).json({ message: '잘못된 요청입니다.' });
    }
}

//찜하기 기능 구현 완료
async function likeChallenge(req, res) {
    if (!res.locals.user) {
        res.status(401).send({
            message: '로그인 후 사용하시오',
        });
        return;
    }
    try {
        const { userId } = res.locals.user;
        const { challengeId } = req.params;
        const existUser = await User.findById(userId);
        const existLikes = existUser.likes;
        const existChallenge = await Challenge.findById(challengeId);
        const likeUsers = existChallenge.likeUsers;
        if (!existLikes.includes(challengeId)) {
            existLikes.push(challengeId);
            likeUsers.push(userId);
            await User.updateOne({ _id: userId }, { $set: { likes: existLikes } });
            await Challenge.updateOne({ _id: challengeId }, { $set: { likeUsers: likeUsers } });
            res.status(201).json({ message: '찜하기 성공' });
        } else {
            res.status(400).json({ message: '찜하기 실패' });
        }
    } catch (err) {
        return res.status(400).json({ message: '잘못된 요청입니다.' });
    }
}

// 찜하기 취소 기능 구현 완료
async function likeCancelChallenge(req, res) {
    if (!res.locals.user) {
        res.status(401).send({
            message: '로그인 후 사용하시오',
        });
        return;
    }
    try {
        const { userId } = res.locals.user;
        const { challengeId } = req.params;
        const existUser = await User.findById(userId);
        const existLikes = existUser.likes;
        const existChallenge = await Challenge.findById(challengeId);
        const likeUsers = existChallenge.likeUsers;
        if (existLikes.includes(challengeId)) {
            existLikes.splice(existLikes.indexOf(challengeId), 1);
            likeUsers.splice(likeUsers.indexOf(userId), 1);
            await User.updateOne({ _id: userId }, { $set: { likes: existLikes } });
            await Challenge.updateOne({ _id: challengeId }, { $set: { likeUsers: likeUsers } });
            res.status(200).json({ message: '찜하기 취소 성공' });
        } else {
            res.status(400).json({ message: '찜하기 취소 실패' });
        }
    } catch (err) {
        return res.status(400).json({ message: '잘못된 요청입니다.' });
    }
}

module.exports = {
    recommendChallenge,
    searchChallenge,
    getCategoryList,
    getDetailChallenge,
    joinChallenge,
    writeChallenge,
    changeChallenge,
    joinCancelChallenge,
    likeChallenge,
    likeCancelChallenge,
};
