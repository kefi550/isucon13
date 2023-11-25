"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderateHandler = exports.reportLivecommentHandler = exports.postLivecommentHandler = exports.getNgwords = exports.getLivecommentsHandler = void 0;
const verify_user_session_middleare_1 = require("../middlewares/verify-user-session-middleare");
const contants_1 = require("../contants");
const fill_livecomment_response_1 = require("../utils/fill-livecomment-response");
const fill_livecomment_report_response_1 = require("../utils/fill-livecomment-report-response");
const throw_error_with_1 = require("../utils/throw-error-with");
const integer_1 = require("../utils/integer");
// GET /api/livestream/:livestream_id/livecomment
exports.getLivecommentsHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const livestreamId = (0, integer_1.atoi)(c.req.param('livestream_id'));
        if (livestreamId === false) {
            return c.text('livestream_id in path must be integer', 400);
        }
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            let query = 'SELECT * FROM livecomments WHERE livestream_id = ? ORDER BY created_at DESC';
            const limit = c.req.query('limit');
            if (limit) {
                const limitNumber = (0, integer_1.atoi)(limit);
                if (limitNumber === false) {
                    return c.text('limit query parameter must be integer', 400);
                }
                query += ` LIMIT ${limitNumber}`;
            }
            const [livecomments] = yield conn
                .query(query, [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livecomments'));
            const livecommnetResponses = [];
            for (const livecomment of livecomments) {
                const livecommentResponse = yield (0, fill_livecomment_response_1.fillLivecommentResponse)(conn, livecomment, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livecomment'));
                livecommnetResponses.push(livecommentResponse);
            }
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(livecommnetResponses);
        }
        catch (error) {
            yield conn.rollback();
            return c.text(`Internal Server Error\n${error}`, 500);
        }
        finally {
            yield conn.rollback();
            conn.release();
        }
    }),
];
// GET /api/livestream/:livestream_id/ngwords
exports.getNgwords = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = c.get('session').get(contants_1.defaultUserIDKey); // userId is verified by verifyUserSessionMiddleware
        const livestreamId = (0, integer_1.atoi)(c.req.param('livestream_id'));
        if (livestreamId === false) {
            return c.text('livestream_id in path must be integer', 400);
        }
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [ngwords] = yield conn
                .query('SELECT * FROM ng_words WHERE user_id = ? AND livestream_id = ? ORDER BY created_at DESC', [userId, livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get NG words'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(ngwords.map((ngword) => ({
                id: ngword.id,
                user_id: ngword.user_id,
                livestream_id: ngword.livestream_id,
                word: ngword.word,
                created_at: ngword.created_at,
            })));
        }
        catch (error) {
            yield conn.rollback();
            return c.text(`Internal Server Error\n${error}`, 500);
        }
        finally {
            yield conn.rollback();
            conn.release();
        }
    }),
];
// POST /api/livestream/:livestream_id/livecomment
exports.postLivecommentHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = c.get('session').get(contants_1.defaultUserIDKey); // userId is verified by verifyUserSessionMiddleware
        const livestreamId = (0, integer_1.atoi)(c.req.param('livestream_id'));
        if (livestreamId === false) {
            return c.text('livestream_id in path must be integer', 400);
        }
        const body = yield c.req.json();
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [[livestream]] = yield conn
                .execute(`SELECT * FROM livestreams WHERE id = ?`, [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestream'));
            if (!livestream) {
                yield conn.rollback();
                return c.text('livestream not found', 404);
            }
            // スパム判定
            const [ngwords] = yield conn
                .query('SELECT id, user_id, livestream_id, word FROM ng_words WHERE user_id = ? AND livestream_id = ?', [livestream.user_id, livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get NG words'));
            for (const ngword of ngwords) {
                const [[{ 'COUNT(*)': hitSpam }]] = yield conn
                    .query(`
              SELECT COUNT(*)
              FROM
              (SELECT ? AS text) AS texts
              INNER JOIN
              (SELECT CONCAT('%', ?, '%')	AS pattern) AS patterns
              ON texts.text LIKE patterns.pattern;
            `, [body.comment, ngword.word])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to get hitspam'));
                console.info(`[hitSpam=${hitSpam}] comment = ${body.comment}`);
                if (hitSpam >= 1) {
                    yield conn.rollback();
                    return c.text('このコメントがスパム判定されました', 400);
                }
            }
            const now = Date.now();
            const [{ insertId: livecommentId }] = yield conn
                .query('INSERT INTO livecomments (user_id, livestream_id, comment, tip, created_at) VALUES (?, ?, ?, ?, ?)', [userId, livestreamId, body.comment, body.tip, now])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to insert livecomment'));
            const livecommentResponse = yield (0, fill_livecomment_response_1.fillLivecommentResponse)(conn, {
                id: livecommentId,
                user_id: userId,
                livestream_id: livestreamId,
                comment: body.comment,
                tip: body.tip,
                created_at: now,
            }, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livecomment'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(livecommentResponse, 201);
        }
        catch (error) {
            yield conn.rollback();
            return c.text(`Internal Server Error\n${error}`, 500);
        }
        finally {
            yield conn.rollback();
            conn.release();
        }
    }),
];
// POST /api/livestream/:livestream_id/livecomment/:livecomment_id/report
exports.reportLivecommentHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = c.get('session').get(contants_1.defaultUserIDKey); // userId is verified by verifyUserSessionMiddleware
        const livestreamId = (0, integer_1.atoi)(c.req.param('livestream_id'));
        if (livestreamId === false) {
            return c.text('livestream_id in path must be integer', 400);
        }
        const livecommentId = (0, integer_1.atoi)(c.req.param('livecomment_id'));
        if (livecommentId === false) {
            return c.text('livecomment_id in path must be integer', 400);
        }
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const now = Date.now();
            const [[livestream]] = yield conn
                .execute(`SELECT * FROM livestreams WHERE id = ?`, [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestream'));
            if (!livestream) {
                yield conn.rollback();
                return c.text('livestream not found', 404);
            }
            const [[livecomment]] = yield conn
                .execute(`SELECT * FROM livecomments WHERE id = ?`, [livecommentId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livecomment'));
            if (!livecomment) {
                yield conn.rollback();
                return c.text('livecomment not found', 404);
            }
            const [{ insertId: reportId }] = yield conn
                .query('INSERT INTO livecomment_reports(user_id, livestream_id, livecomment_id, created_at) VALUES (?, ?, ?, ?)', [userId, livestreamId, livecommentId, now])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to insert livecomment report'));
            const livecommentReportResponse = yield (0, fill_livecomment_report_response_1.fillLivecommentReportResponse)(conn, {
                id: reportId,
                user_id: userId,
                livestream_id: livestreamId,
                livecomment_id: livecommentId,
                created_at: now,
            }, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livecomment report'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(livecommentReportResponse, 201);
        }
        catch (error) {
            yield conn.rollback();
            return c.text(`Internal Server Error\n${error}`, 500);
        }
        finally {
            yield conn.rollback();
            conn.release();
        }
    }),
];
// POST /api/livestream/:livestream_id/moderate
exports.moderateHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = c.get('session').get(contants_1.defaultUserIDKey); // userId is verified by verifyUserSessionMiddleware
        const livestreamId = (0, integer_1.atoi)(c.req.param('livestream_id'));
        if (livestreamId === false) {
            return c.text('livestream_id in path must be integer', 400);
        }
        const body = yield c.req.json();
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            // 配信者自身の配信に対するmoderateなのかを検証
            const [ownedLivestreams] = yield conn
                .query('SELECT * FROM livestreams WHERE id = ? AND user_id = ?', [livestreamId, userId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestreams'));
            if (ownedLivestreams.length === 0) {
                yield conn.rollback();
                return c.text("A streamer can't moderate livestreams that other streamers own", 400);
            }
            const [{ insertId: wordId }] = yield conn
                .query('INSERT INTO ng_words(user_id, livestream_id, word, created_at) VALUES (?, ?, ?, ?)', [userId, livestreamId, body.ng_word, Date.now()])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to insert new NG word'));
            const [ngwords] = yield conn
                .query('SELECT * FROM ng_words WHERE livestream_id = ?', [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get NG words'));
            // NGワードにヒットする過去の投稿も全削除する
            for (const ngword of ngwords) {
                // ライブコメント一覧取得
                const [livecomments] = yield conn
                    .query('SELECT * FROM livecomments')
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to get livecomments'));
                for (const livecomment of livecomments) {
                    yield conn
                        .query(`
                DELETE FROM livecomments
                WHERE
                id = ? AND
                livestream_id = ? AND
                (SELECT COUNT(*)
                FROM
                (SELECT ? AS text) AS texts
                INNER JOIN
                (SELECT CONCAT('%', ?, '%')	AS pattern) AS patterns
                ON texts.text LIKE patterns.pattern) >= 1;
              `, [livecomment.id, livestreamId, livecomment.comment, ngword.word])
                        .catch((0, throw_error_with_1.throwErrorWith)('failed to delete old livecomments that hit spams'));
                }
            }
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json({ word_id: wordId }, 201);
        }
        catch (error) {
            yield conn.rollback();
            return c.text(`Internal Server Error\n${error}`, 500);
        }
        finally {
            yield conn.rollback();
            conn.release();
        }
    }),
];
