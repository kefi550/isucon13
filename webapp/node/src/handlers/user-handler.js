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
exports.getUserHandler = exports.loginHandler = exports.registerHandler = exports.getMeHandler = exports.postIconHandler = exports.getIconHandler = void 0;
const contants_1 = require("../contants");
const verify_user_session_middleare_1 = require("../middlewares/verify-user-session-middleare");
const fill_user_response_1 = require("../utils/fill-user-response");
const throw_error_with_1 = require("../utils/throw-error-with");
// GET /api/user/:username/icon
exports.getIconHandler = [
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const username = c.req.param('username');
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [[user]] = yield conn
                .query('SELECT * FROM users WHERE name = ?', [username])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get user'));
            if (!user) {
                yield conn.rollback();
                return c.text('not found user that has the given username', 404);
            }
            const [[icon]] = yield conn
                .query('SELECT image FROM icons WHERE user_id = ?', [user.id])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get icon'));
            if (!icon) {
                yield conn.rollback();
                return c.body(yield c.get('runtime').fallbackUserIcon(), 200, {
                    'Content-Type': 'image/jpeg',
                });
            }
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.body(icon.image, 200, {
                'Content-Type': 'image/jpeg',
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
// POST /api/icon
exports.postIconHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = c.get('session').get(contants_1.defaultUserIDKey); // userId is verified by verifyUserSessionMiddleware
        // base64 encoded image
        const body = yield c.req.json();
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            yield conn
                .execute('DELETE FROM icons WHERE user_id = ?', [userId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to delete old user icon'));
            const [{ insertId: iconId }] = yield conn
                .query('INSERT INTO icons (user_id, image) VALUES (?, ?)', [userId, Buffer.from(body.image, 'base64')])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to insert icon'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json({ id: iconId }, 201);
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
// GET /api/user/me
exports.getMeHandler = [
    verify_user_session_middleare_1.verifyUserSessionMiddleware,
    (c) => __awaiter(void 0, void 0, void 0, function* () {
        const userId = c.get('session').get(contants_1.defaultUserIDKey); // userId is verified by verifyUserSessionMiddleware
        const conn = yield c.get('pool').getConnection();
        yield conn.beginTransaction();
        try {
            const [[user]] = yield conn
                .query('SELECT * FROM users WHERE id = ?', [userId])
                .catch((0, throw_error_with_1.throwErrorWith)('failed to get user'));
            if (!user) {
                yield conn.rollback();
                return c.text('not found user that has the userid in session', 404);
            }
            const response = yield (0, fill_user_response_1.fillUserResponse)(conn, user, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill user'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(response);
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
// ユーザ登録API
// POST /api/register
const registerHandler = (c) => __awaiter(void 0, void 0, void 0, function* () {
    const body = yield c.req.json();
    if (body.name === 'pipe') {
        return c.text("the username 'pipe' is reserved", 400);
    }
    const hashedPassword = yield c
        .get('runtime')
        .hashPassword(body.password)
        .catch((0, throw_error_with_1.throwErrorWith)('failed to generate hashed password'));
    const conn = yield c.get('pool').getConnection();
    yield conn.beginTransaction();
    try {
        const [{ insertId: userId }] = yield conn
            .execute('INSERT INTO users (name, display_name, description, password) VALUES(?, ?, ?, ?)', [body.name, body.display_name, body.description, hashedPassword])
            .catch((0, throw_error_with_1.throwErrorWith)('failed to insert user'));
        yield conn
            .execute('INSERT INTO themes (user_id, dark_mode) VALUES(?, ?)', [
            userId,
            body.theme.dark_mode,
        ])
            .catch((0, throw_error_with_1.throwErrorWith)('failed to insert user theme'));
        yield c
            .get('runtime')
            .exec([
            'pdnsutil',
            'add-record',
            'u.isucon.dev',
            body.name,
            'A',
            '0',
            c.get('runtime').powerDNSSubdomainAddress,
        ])
            .catch((0, throw_error_with_1.throwErrorWith)('failed to add record to powerdns'));
        const response = yield (0, fill_user_response_1.fillUserResponse)(conn, {
            id: userId,
            name: body.name,
            display_name: body.display_name,
            description: body.description,
        }, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill user'));
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
});
exports.registerHandler = registerHandler;
// ユーザログインAPI
// POST /api/login
const loginHandler = (c) => __awaiter(void 0, void 0, void 0, function* () {
    const body = yield c.req.json();
    const conn = yield c.get('pool').getConnection();
    yield conn.beginTransaction();
    try {
        // usernameはUNIQUEなので、whereで一意に特定できる
        const [[user]] = yield conn
            .query('SELECT * FROM users WHERE name = ?', [body.username])
            .catch((0, throw_error_with_1.throwErrorWith)('failed to get user'));
        if (!user) {
            yield conn.rollback();
            return c.text('invalid username or password', 401);
        }
        yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
        const isPasswordMatch = yield c
            .get('runtime')
            .comparePassword(body.password, user.password)
            .catch((0, throw_error_with_1.throwErrorWith)('failed to compare hash and password'));
        if (!isPasswordMatch) {
            return c.text('invalid username or password', 401);
        }
        // 1時間でセッションが切れるようにする
        const sessionEndAt = Date.now() + 1000 * 60 * 60;
        const session = c.get('session');
        session.set(contants_1.defaultUserIDKey, user.id);
        session.set(contants_1.defaultUserNameKey, user.name);
        session.set(contants_1.defaultSessionExpiresKey, sessionEndAt);
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
});
exports.loginHandler = loginHandler;
// GET /api/user/:username
exports.getUserHandler = [
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
                yield conn.rollback();
                return c.text('not found user that has the given username', 404);
            }
            const response = yield (0, fill_user_response_1.fillUserResponse)(conn, user, c.get('runtime').fallbackUserIcon).catch((0, throw_error_with_1.throwErrorWith)('failed to fill user'));
            yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
            return c.json(response);
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
