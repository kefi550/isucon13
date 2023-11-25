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
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_server_1 = require("@hono/node-server");
const bcrypt_1 = require("bcrypt");
const promise_1 = require("mysql2/promise");
const hono_sessions_1 = require("hono-sessions");
const hono_1 = require("hono");
const logger_1 = require("hono/logger");
const livecomment_handler_1 = require("./handlers/livecomment-handler");
const livestream_handler_1 = require("./handlers/livestream-handler");
const payment_handler_1 = require("./handlers/payment-handler");
const reaction_handler_1 = require("./handlers/reaction-handler");
const stats_handler_1 = require("./handlers/stats-handler");
const top_handler_1 = require("./handlers/top-handler");
const user_handler_1 = require("./handlers/user-handler");
const runtime = {
    exec: (cmd) => __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const proc = (0, node_child_process_1.spawn)(cmd[0], cmd.slice(1));
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (data) => (stdout += data));
            proc.stderr.on('data', (data) => (stderr += data));
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                }
                else {
                    reject(new Error(`command failed with code ${code}\n${stderr}\n${stdout}`));
                }
            });
        });
    }),
    hashPassword: (password) => __awaiter(void 0, void 0, void 0, function* () { return (0, bcrypt_1.hash)(password, 4); }),
    comparePassword: (password, hash) => __awaiter(void 0, void 0, void 0, function* () { return (0, bcrypt_1.compare)(password, hash); }),
    fallbackUserIcon: () => 
    // eslint-disable-next-line unicorn/prefer-module, unicorn/prefer-top-level-await
    (0, promises_1.readFile)((0, node_path_1.join)(__dirname, '../../img/NoImage.jpg')).then((v) => {
        const buf = v.buffer;
        if (buf instanceof ArrayBuffer) {
            return buf;
        }
        else {
            throw new TypeError(`NoImage.jpg should be ArrayBuffer, but ${buf}`);
        }
    }),
};
const pool = (0, promise_1.createPool)({
    user: (_a = process.env['ISUCON13_MYSQL_DIALCONFIG_USER']) !== null && _a !== void 0 ? _a : 'isucon',
    password: (_b = process.env['ISUCON13_MYSQL_DIALCONFIG_PASSWORD']) !== null && _b !== void 0 ? _b : 'isucon',
    database: (_c = process.env['ISUCON13_MYSQL_DIALCONFIG_DATABASE']) !== null && _c !== void 0 ? _c : 'isupipe',
    host: (_d = process.env['ISUCON13_MYSQL_DIALCONFIG_ADDRESS']) !== null && _d !== void 0 ? _d : '127.0.0.1',
    port: Number((_e = process.env['ISUCON13_MYSQL_DIALCONFIG_PORT']) !== null && _e !== void 0 ? _e : '3306'),
    connectionLimit: 10,
});
if (!process.env['ISUCON13_POWERDNS_SUBDOMAIN_ADDRESS']) {
    throw new Error('envionment variable ISUCON13_POWERDNS_SUBDOMAIN_ADDRESS is not set');
}
const powerDNSSubdomainAddress = process.env['ISUCON13_POWERDNS_SUBDOMAIN_ADDRESS'];
const store = new hono_sessions_1.CookieStore();
const applicationDeps = Object.assign(Object.assign({}, runtime), { powerDNSSubdomainAddress });
const app = new hono_1.Hono();
app.use('*', (0, logger_1.logger)());
app.use('*', (0, hono_sessions_1.sessionMiddleware)({
    store,
    encryptionKey: '24553845-c33d-4a87-b0c3-f7a0e17fd82f',
    cookieOptions: {
        path: '/',
        domain: 'u.isucon.dev',
        maxAge: 60000,
    },
}));
app.use('*', (c, next) => __awaiter(void 0, void 0, void 0, function* () {
    c.set('pool', pool);
    c.set('runtime', applicationDeps);
    yield next();
}));
app.use('*', (c, next) => __awaiter(void 0, void 0, void 0, function* () {
    yield next();
    if (c.res.status >= 400) {
        console.error(c.res.status, yield c.res.clone().text());
    }
}));
// 初期化
app.post('/api/initialize', (c) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield runtime.exec(['../sql/init.sh']);
        return c.json({ language: 'node' });
    }
    catch (error) {
        console.log('init.sh failed with');
        console.log(error);
        return c.text('failed to initialize', 500);
    }
}));
// top
app.get('/api/tag', top_handler_1.getTagHandler);
app.get('/api/user/:username/theme', ...top_handler_1.getStreamerThemeHandler);
// livestream
// reserve livestream
app.post('/api/livestream/reservation', ...livestream_handler_1.reserveLivestreamHandler);
// list livestream
app.get('/api/livestream/search', livestream_handler_1.searchLivestreamsHandler);
app.get('/api/livestream', ...livestream_handler_1.getMyLivestreamsHandler);
app.get('/api/user/:username/livestream', ...livestream_handler_1.getUserLivestreamsHandler);
// get livestream
app.get('/api/livestream/:livestream_id', ...livestream_handler_1.getLivestreamHandler);
// get polling livecomment timeline
app.get('/api/livestream/:livestream_id/livecomment', ...livecomment_handler_1.getLivecommentsHandler);
// ライブコメント投稿
app.post('/api/livestream/:livestream_id/livecomment', ...livecomment_handler_1.postLivecommentHandler);
app.post('/api/livestream/:livestream_id/reaction', ...reaction_handler_1.postReactionHandler);
app.get('/api/livestream/:livestream_id/reaction', ...reaction_handler_1.getReactionsHandler);
// (配信者向け)ライブコメントの報告一覧取得API
app.get('/api/livestream/:livestream_id/report', ...livestream_handler_1.getLivecommentReportsHandler);
app.get('/api/livestream/:livestream_id/ngwords', ...livecomment_handler_1.getNgwords);
// ライブコメント報告
app.post('/api/livestream/:livestream_id/livecomment/:livecomment_id/report', ...livecomment_handler_1.reportLivecommentHandler);
// 配信者によるモデレーション (NGワード登録)
app.post('/api/livestream/:livestream_id/moderate', ...livecomment_handler_1.moderateHandler);
// livestream_viewersにINSERTするため必要
// ユーザ視聴開始 (viewer)
app.post('/api/livestream/:livestream_id/enter', ...livestream_handler_1.enterLivestreamHandler);
// ユーザ視聴終了 (viewer)
app.delete('/api/livestream/:livestream_id/exit', ...livestream_handler_1.exitLivestreamHandler);
// user
app.post('/api/register', user_handler_1.registerHandler);
app.post('/api/login', user_handler_1.loginHandler);
app.get('/api/user/me', ...user_handler_1.getMeHandler);
// フロントエンドで、配信予約のコラボレーターを指定する際に必要
app.get('/api/user/:username', ...user_handler_1.getUserHandler);
app.get('/api/user/:username/statistics', ...stats_handler_1.getUserStatisticsHandler);
app.get('/api/user/:username/icon', ...user_handler_1.getIconHandler);
app.post('/api/icon', ...user_handler_1.postIconHandler);
// stats
// ライブ配信統計情報
app.get('/api/livestream/:livestream_id/statistics', ...stats_handler_1.getLivestreamStatisticsHandler);
// // 課金情報
app.get('/api/payment', payment_handler_1.GetPaymentResult);
(0, node_server_1.serve)(Object.assign(Object.assign({}, app), { port: 8080 }), (add) => console.log(`Listening on http://localhost:${add.port}`));
