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
exports.postReactionHandler = exports.getReactionsHandler = void 0;
const verify_user_session_middleare_1 = require("../middlewares/verify-user-session-middleare");
const contants_1 = require("../contants");
const fill_reaction_response_1 = require("../utils/fill-reaction-response");
const throw_error_with_1 = require("../utils/throw-error-with");
const integer_1 = require("../utils/integer");
// GET /api/livestream/:livestream_id/reaction
exports.getReactionsHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const livestreamId = (0, integer_1.atoi)(c.req.param('livestream_id'));
        if (livestreamId === false) {
            return c.text('livestream_id in path must be integer', 400);
        }
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            let query = 'SELECT * FROM reactions WHERE livestream_id = ? ORDER BY created_at DESC';
            const limit = c.req.query('limit');
            if (limit) {
                const limitNumber = (0, integer_1.atoi)(limit);
                if (limitNumber === false) {
                    return c.text('limit query parameter must be integer', 400);
                }
                query += ` LIMIT ${limitNumber}`;
            }
            const [reactions] = yield conn
                .query(query, [livestreamId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get reactions'));
            const reactionResponses = [];
            for (const reaction of reactions) {
                const reactionResponse = yield (0, fill_reaction_response_1.fillReactionResponse)(conn, reaction, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill reaction'));
                reactionResponses.push(reactionResponse);
            }
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(reactionResponses);
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
// POST /api/livestream/:livestream_id/reaction
exports.postReactionHandler = [
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
            const now = Date.now();
            const [{ insertId: reactionId }] = yield conn
                .query('INSERT INTO reactions (user_id, livestream_id, emoji_name, created_at) VALUES (?, ?, ?, ?)', [userId, livestreamId, body.emoji_name, now])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to insert reaction'));
            const reactionResponse = yield (0, fill_reaction_response_1.fillReactionResponse)(conn, {
                id: reactionId,
                emoji_name: body.emoji_name,
                user_id: userId,
                livestream_id: livestreamId,
                created_at: now,
            }, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill reaction'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(reactionResponse, 201);
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
