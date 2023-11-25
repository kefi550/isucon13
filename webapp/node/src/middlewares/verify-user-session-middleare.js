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
exports.verifyUserSessionMiddleware = void 0;
const contants_1 = require("../contants");
const verifyUserSessionMiddleware = (c, next) => __awaiter(void 0, void 0, void 0, function* () {
    const session = c.get('session');
    const sessionExpires = session.get(contants_1.defaultSessionExpiresKey);
    if (typeof sessionExpires !== 'number') {
        return c.text('failed to get EXPIRES value from session', 403);
    }
    if (typeof session.get(contants_1.defaultUserIDKey) !== 'number') {
        return c.text('failed to get USERID value from session', 403);
    }
    if (Date.now() > sessionExpires) {
        return c.text('session has expired', 403);
    }
    yield next();
});
exports.verifyUserSessionMiddleware = verifyUserSessionMiddleware;
