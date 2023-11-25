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
exports.getLivecommentReportsHandler = exports.getLivestreamHandler = exports.exitLivestreamHandler = exports.enterLivestreamHandler = exports.getUserLivestreamsHandler = exports.getMyLivestreamsHandler = exports.searchLivestreamsHandler = exports.reserveLivestreamHandler = void 0;
const verify_user_session_middleare_1 = require("../middlewares/verify-user-session-middleare");
const contants_1 = require("../contants");
const fill_livestream_response_1 = require("../utils/fill-livestream-response");
const fill_livecomment_report_response_1 = require("../utils/fill-livecomment-report-response");
const throw_error_with_1 = require("../utils/throw-error-with");
const integer_1 = require("../utils/integer");
// POST /api/livestream/reservation
exports.reserveLivestreamHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = c.get('session').get(contants_1.defaultUserIDKey); // userId is verified by verifyUserSessionMiddleware
        const body = yield c.req.json();
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            // 2023/11/25 10:00からの１年間の期間内であるかチェック
            const termStartAt = Date.UTC(2023, 10, 25, 1);
            const termEndAt = Date.UTC(2024, 10, 25, 1);
            const reserveStartAt = body.start_at * 1000;
            const reserveEndAt = body.end_at * 1000;
            if (reserveStartAt >= termEndAt || reserveEndAt <= termStartAt) {
                yield conn.rollback();
                return c.text('bad reservation time range', 400);
            }
            // 予約枠をみて、予約が可能か調べる
            // NOTE: 並列な予約のoverbooking防止にFOR UPDATEが必要
            const [slots] = yield conn
                .query('SELECT * FROM reservation_slots WHERE start_at >= ? AND end_at <= ? FOR UPDATE', [body.start_at, body.end_at])
                .catch((error) => {
                console.warn(`予約枠一覧取得でエラー発生: ${error}`);
                return (0, throw_error_with_1.throwErrorWith)('failed to get reservation_slots')(error);
            });
            for (const slot of slots) {
                const [[count]] = yield conn
                    .query('SELECT slot FROM reservation_slots WHERE start_at = ? AND end_at = ?', [slot.start_at, slot.end_at])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to get reservation_slots'));
                console.info(`${slot.start_at} ~ ${slot.end_at} 予約枠の残数 = ${count.slot}`);
                if (count.slot < 1) {
                    return c.text(`予約期間 ${Math.floor(termStartAt / 1000)} ~ ${Math.floor(termEndAt / 1000)}に対して、予約区間 ${body.start_at} ~ ${body.end_at}が予約できません`, 400);
                }
            }
            yield conn
                .query('UPDATE reservation_slots SET slot = slot - 1 WHERE start_at >= ? AND end_at <= ?', [body.start_at, body.end_at])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to update reservation_slot'));
            const [{ insertId: livestreamId }] = yield conn
                .query('INSERT INTO livestreams (user_id, title, description, playlist_url, thumbnail_url, start_at, end_at) VALUES(?, ?, ?, ?, ?, ?, ?)', [
                userId,
                body.title,
                body.description,
                body.playlist_url,
                body.thumbnail_url,
                body.start_at,
                body.end_at,
            ])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to insert livestream'));
            // タグ追加
            for (const tagId of body.tags) {
                yield conn
                    .execute('INSERT INTO livestream_tags (livestream_id, tag_id) VALUES (?, ?)', [livestreamId, tagId])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to insert livestream tag'));
            }
            const response = yield (0, fill_livestream_response_1.fillLivestreamResponse)(conn, {
                id: livestreamId,
                user_id: userId,
                title: body.title,
                description: body.description,
                playlist_url: body.playlist_url,
                thumbnail_url: body.thumbnail_url,
                start_at: body.start_at,
                end_at: body.end_at,
            }, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livestream'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(response, 201);
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
// GET /api/livestream/search
const searchLivestreamsHandler = (c) => __awaiter(void 0, void 0, void 0, function* () {
    const keyTagName = c.req.query('tag');
    const conn = yield c.get('pool').getConnection();
    yield conn.beginTransaction();
    try {
        const livestreams = [];
        if (keyTagName) {
            // タグによる取得
            const [tagIds] = yield conn
                .query('SELECT id FROM tags WHERE name = ?', [keyTagName])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get tag'));
            const [livestreamTags] = yield conn
                .query('SELECT * FROM livestream_tags WHERE tag_id IN (?) ORDER BY livestream_id DESC', [tagIds.map((tag) => tag.id)])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get keyTaggedLivestreams'));
            for (const livestreamTag of livestreamTags) {
                const [[livestream]] = yield conn
                    .query('SELECT * FROM livestreams WHERE id = ?', [livestreamTag.livestream_id])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestreams'));
                livestreams.push(livestream);
            }
        }
        else {
            // 検索条件なし
            let query = `SELECT * FROM livestreams ORDER BY id DESC`;
            const limit = c.req.query('limit');
            if (limit) {
                const limitNumber = (0, integer_1.atoi)(limit);
                if (limitNumber === false) {
                    return c.text('limit query parameter must be integer', 400);
                }
                query += ` LIMIT ${limitNumber}`;
            }
            const [results] = yield conn
                .query(query)
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestreams'));
            livestreams.push(...results);
        }
        const livestreamResponses = [];
        for (const livestream of livestreams) {
            const livestreamResponse = yield (0, fill_livestream_response_1.fillLivestreamResponse)(conn, livestream, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livestream'));
            livestreamResponses.push(livestreamResponse);
        }
        yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
        return c.json(livestreamResponses);
    }
    catch (error) {
        yield conn.rollback();
        return c.text(`Internal Server Error\n${error}`, 500);
    }
    finally {
        yield conn.rollback();
        conn.release();
    }
});
exports.searchLivestreamsHandler = searchLivestreamsHandler;
// GET /api/livestream
exports.getMyLivestreamsHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = c.get('session').get(contants_1.defaultUserIDKey); // userId is verified by verifyUserSessionMiddleware
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [livestreams] = yield conn
                .query('SELECT * FROM livestreams WHERE user_id = ?', [userId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestreams'));
            const livestreamResponses = [];
            for (const livestream of livestreams) {
                const livestreamResponse = yield (0, fill_livestream_response_1.fillLivestreamResponse)(conn, livestream, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livestream'));
                livestreamResponses.push(livestreamResponse);
            }
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(livestreamResponses);
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
// GET /api/user/:username/livestream
exports.getUserLivestreamsHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const username = c.req.param('username');
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [[user]] = yield conn
                .query('SELECT * FROM users WHERE name = ?', [username])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get user'));
            if (!user) {
                return c.text('user not found', 404);
            }
            const [livestreams] = yield conn
                .query('SELECT * FROM livestreams WHERE user_id = ?', [user.id])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestreams'));
            const livestreamResponses = [];
            for (const livestream of livestreams) {
                const livestreamResponse = yield (0, fill_livestream_response_1.fillLivestreamResponse)(conn, livestream, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livestream'));
                livestreamResponses.push(livestreamResponse);
            }
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(livestreamResponses);
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
// POST /api/livestream/:livestream_id/enter
exports.enterLivestreamHandler = [
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
            yield conn
                .query('INSERT INTO livestream_viewers_history (user_id, livestream_id, created_at) VALUES(?, ?, ?)', [userId, livestreamId, Date.now()])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to insert livestream_view_history'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            // eslint-disable-next-line unicorn/no-null
            return c.body(null);
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
// DELETE /api/livestream/:livestream_id/exit
exports.exitLivestreamHandler = [
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
            yield conn
                .query('DELETE FROM livestream_viewers_history WHERE user_id = ? AND livestream_id = ?', [userId, livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to delete livestream_view_history'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            // eslint-disable-next-line unicorn/no-null
            return c.body(null);
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
// GET /api/livestream/:livestream_id
exports.getLivestreamHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const livestreamId = (0, integer_1.atoi)(c.req.param('livestream_id'));
        if (livestreamId === false) {
            return c.text('livestream_id in path must be integer', 400);
        }
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [[livestream]] = yield conn
                .query('SELECT * FROM livestreams WHERE id = ?', [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestream'));
            if (!livestream) {
                return c.text('not found livestream that has the given id', 404);
            }
            const livestreamResponse = yield (0, fill_livestream_response_1.fillLivestreamResponse)(conn, livestream, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livestream'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(livestreamResponse);
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
// GET /api/livestream/:livestream_id/report
exports.getLivecommentReportsHandler = [
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
            const [[livestream]] = yield conn
                .query('SELECT * FROM livestreams WHERE id = ?', [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestream'));
            if (livestream.user_id !== userId) {
                return c.text("can't get other streamer's livecomment reports", 403);
            }
            const [livecommentReports] = yield conn
                .query('SELECT * FROM livecomment_reports WHERE livestream_id = ?', [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livecomment reports'));
            const reportResponses = [];
            for (const livecommentReport of livecommentReports) {
                const report = yield (0, fill_livecomment_report_response_1.fillLivecommentReportResponse)(conn, livecommentReport, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill livecomment report'));
                reportResponses.push(report);
            }
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(reportResponses);
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
