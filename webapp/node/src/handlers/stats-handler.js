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
exports.getLivestreamStatisticsHandler = exports.getUserStatisticsHandler = void 0;
const verify_user_session_middleare_1 = require("../middlewares/verify-user-session-middleare");
const throw_error_with_1 = require("../utils/throw-error-with");
const integer_1 = require("../utils/integer");
// GET /api/user/:username/statistics
exports.getUserStatisticsHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const username = c.req.param('username');
        // ユーザごとに、紐づく配信について、累計リアクション数、累計ライブコメント数、累計売上金額を算出
        // また、現在の合計視聴者数もだす
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [[user]] = yield conn
                .query('SELECT * FROM users WHERE name = ?', [username])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get user'));
            if (!user) {
                yield conn.rollback();
                return c.json('not found user that has the given username', 404);
            }
            // ランク算出
            const [users] = yield conn
                .query('SELECT * FROM users')
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get users'));
            const ranking = [];
            for (const user of users) {
                const [[{ 'COUNT(*)': reaction }]] = yield conn
                    .query(`
              SELECT COUNT(*) FROM users u
              INNER JOIN livestreams l ON l.user_id = u.id
              INNER JOIN reactions r ON r.livestream_id = l.id
              WHERE u.id = ?
            `, [user.id])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to count reactions'));
                const [[{ 'IFNULL(SUM(l2.tip), 0)': tips }]] = yield conn
                    .query(`
              SELECT IFNULL(SUM(l2.tip), 0) FROM users u
              INNER JOIN livestreams l ON l.user_id = u.id	
              INNER JOIN livecomments l2 ON l2.livestream_id = l.id
              WHERE u.id = ?
            `, [user.id])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to count tips'));
                ranking.push({
                    username: user.name,
                    score: reaction + Number(tips),
                });
            }
            ranking.sort((a, b) => {
                if (a.score === b.score)
                    return a.username.localeCompare(b.username);
                return a.score - b.score;
            });
            let rank = 1;
            for (const r of ranking.toReversed()) {
                if (r.username === username) {
                    break;
                }
                rank++;
            }
            // リアクション数
            const [[{ 'COUNT(*)': totalReactions }]] = yield conn
                .query(`
            SELECT COUNT(*) FROM users u 
            INNER JOIN livestreams l ON l.user_id = u.id 
            INNER JOIN reactions r ON r.livestream_id = l.id
            WHERE u.name = ?
          `, [username])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to count reactions'));
            // ライブコメント数、チップ合計
            let totalLivecomments = 0;
            let totalTip = 0;
            const [livestreams] = yield conn
                .query(`SELECT * FROM livestreams WHERE user_id = ?`, [user.id])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestreams'));
            for (const livestream of livestreams) {
                const [livecomments] = yield conn
                    .query(`SELECT * FROM livecomments WHERE livestream_id = ?`, [livestream.id])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to get livecomments'));
                for (const livecomment of livecomments) {
                    totalTip += livecomment.tip;
                    totalLivecomments++;
                }
            }
            // 合計視聴者数
            let viewersCount = 0;
            for (const livestream of livestreams) {
                const [[{ 'COUNT(*)': livestreamViewerCount }]] = yield conn
                    .query(`SELECT COUNT(*) FROM livestream_viewers_history WHERE livestream_id = ?`, [livestream.id])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestream_view_history'));
                viewersCount += livestreamViewerCount;
            }
            // お気に入り絵文字
            const [[favoriteEmoji]] = yield conn
                .query(`
            SELECT r.emoji_name
            FROM users u
            INNER JOIN livestreams l ON l.user_id = u.id
            INNER JOIN reactions r ON r.livestream_id = l.id
            WHERE u.name = ?
            GROUP BY emoji_name
            ORDER BY COUNT(*) DESC, emoji_name DESC
            LIMIT 1
          `, [username])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get favorite emoji'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json({
                rank,
                viewers_count: viewersCount,
                total_reactions: totalReactions,
                total_livecomments: totalLivecomments,
                total_tip: totalTip,
                favorite_emoji: favoriteEmoji === null || favoriteEmoji === void 0 ? void 0 : favoriteEmoji.emoji_name,
            });
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
// GET /api/livestream/:livestream_id/statistics
exports.getLivestreamStatisticsHandler = [
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
                yield conn.rollback();
                return c.json('cannot get stats of not found livestream', 404);
            }
            const [livestreams] = yield conn
                .query('SELECT * FROM livestreams')
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get livestreams'));
            // ランク算出
            const ranking = [];
            for (const livestream of livestreams) {
                const [[{ 'COUNT(*)': reactionCount }]] = yield conn
                    .query('SELECT COUNT(*) FROM livestreams l INNER JOIN reactions r ON l.id = r.livestream_id WHERE l.id = ?', [livestream.id])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to count reactions'));
                const [[{ 'IFNULL(SUM(l2.tip), 0)': totalTip }]] = yield conn
                    .query('SELECT IFNULL(SUM(l2.tip), 0) FROM livestreams l INNER JOIN livecomments l2 ON l.id = l2.livestream_id WHERE l.id = ?', [livestream.id])
                    .catch((0, throw_error_with_1.throwErrorWith)('failed to count tips'));
                ranking.push({
                    livestreamId: livestream.id,
                    title: livestream.title,
                    score: reactionCount + Number(totalTip),
                });
            }
            ranking.sort((a, b) => {
                if (a.score === b.score)
                    return a.livestreamId - b.livestreamId;
                return a.score - b.score;
            });
            let rank = 1;
            for (const r of ranking.toReversed()) {
                if (r.livestreamId === livestreamId)
                    break;
                rank++;
            }
            // 視聴者数算出
            const [[{ 'COUNT(*)': viewersCount }]] = yield conn
                .query('SELECT COUNT(*) FROM livestreams l INNER JOIN livestream_viewers_history h ON h.livestream_id = l.id WHERE l.id = ?', [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to count viewers'));
            // 最大チップ額
            const [[{ 'IFNULL(MAX(tip), 0)': maxTip }]] = yield conn
                .query('SELECT IFNULL(MAX(tip), 0) FROM livestreams l INNER JOIN livecomments l2 ON l2.livestream_id = l.id WHERE l.id = ?', [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get max tip'));
            // リアクション数
            const [[{ 'COUNT(*)': totalReactions }]] = yield conn
                .query('SELECT COUNT(*) FROM livestreams l INNER JOIN reactions r ON r.livestream_id = l.id WHERE l.id = ?', [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to count reactions'));
            // スパム報告数
            const [[{ 'COUNT(*)': totalReports }]] = yield conn
                .query('SELECT COUNT(*) FROM livestreams l INNER JOIN livecomment_reports r ON r.livestream_id = l.id WHERE l.id = ?', [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to count reports'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json({
                rank,
                viewers_count: viewersCount,
                total_reactions: totalReactions,
                total_reports: totalReports,
                max_tip: maxTip,
            });
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
