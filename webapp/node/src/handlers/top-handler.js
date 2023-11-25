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
exports.getStreamerThemeHandler = exports.getTagHandler = void 0;
const verify_user_session_middleare_1 = require("../middlewares/verify-user-session-middleare");
const throw_error_with_1 = require("../utils/throw-error-with");
// GET /api/tag
const getTagHandler = (c) => __awaiter(void 0, void 0, void 0, function* () {
    const conn = yield c.get('pool').getConnection();
    yield conn.beginTransaction();
    try {
        const [tags] = yield conn
            .execute('SELECT * FROM tags')
            .catch((0, throw_error_with_1.throwErrorWith)('failed to get tags'));
        yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
        const tagResponses = [];
        for (const tag of tags) {
            tagResponses.push({
                id: tag.id,
                name: tag.name,
            });
        }
        return c.json({ tags: tagResponses });
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
exports.getTagHandler = getTagHandler;
// 配信者のテーマ取得API
// GET /api/user/:username/theme
exports.getStreamerThemeHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const username = c.req.param('username');
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [[user]] = yield conn
                .execute('SELECT id FROM users WHERE name = ?', [username])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get user'));
            if (!user) {
                yield conn.rollback();
                return c.text('not found user that has the given username', 404);
            }
            const [[theme]] = yield conn
                .execute('SELECT * FROM themes WHERE user_id = ?', [user.id])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get user theme'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            const themeResponse = {
                id: theme.id,
                dark_mode: !!theme.dark_mode,
            };
            return c.json(themeResponse);
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
