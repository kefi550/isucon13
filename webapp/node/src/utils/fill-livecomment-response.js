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
exports.fillLivecommentResponse = void 0;
const fill_user_response_1 = require("./fill-user-response");
const fill_livestream_response_1 = require("./fill-livestream-response");
const fillLivecommentResponse = (conn, livecomment, getFallbackUserIcon) => __awaiter(void 0, void 0, void 0, function* () {
    const [[user]] = yield conn.query('SELECT * FROM users WHERE id = ?', [livecomment.user_id]);
    if (!user)
        throw new Error('not found user that has the given id');
    const userResponse = yield (0, fill_user_response_1.fillUserResponse)(conn, user, getFallbackUserIcon);
    const [[livestream]] = yield conn.query('SELECT * FROM livestreams WHERE id = ?', [livecomment.livestream_id]);
    if (!livestream)
        throw new Error('not found livestream that has the given id');
    const livestreamResponse = yield (0, fill_livestream_response_1.fillLivestreamResponse)(conn, livestream, getFallbackUserIcon);
    return {
        id: livecomment.id,
        user: userResponse,
        livestream: livestreamResponse,
        comment: livecomment.comment,
        tip: livecomment.tip,
        created_at: livecomment.created_at,
    };
});
exports.fillLivecommentResponse = fillLivecommentResponse;
