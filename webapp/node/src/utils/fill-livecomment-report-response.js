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
exports.fillLivecommentReportResponse = void 0;
const fill_user_response_1 = require("./fill-user-response");
const fill_livecomment_response_1 = require("./fill-livecomment-response");
const fillLivecommentReportResponse = (conn, livecommentReport, getFallbackUserIcon) => __awaiter(void 0, void 0, void 0, function* () {
    const [[user]] = yield conn.query('SELECT * FROM users WHERE id = ?', [livecommentReport.user_id]);
    if (!user)
        throw new Error('not found user that has the given id');
    const userResponse = yield (0, fill_user_response_1.fillUserResponse)(conn, user, getFallbackUserIcon);
    const [[livecomment]] = yield conn.query('SELECT * FROM livecomments WHERE id = ?', [
        livecommentReport.livecomment_id,
    ]);
    if (!livecomment)
        throw new Error('not found livecomment that has the given id');
    const livecommentResponse = yield (0, fill_livecomment_response_1.fillLivecommentResponse)(conn, livecomment, getFallbackUserIcon);
    return {
        id: livecommentReport.id,
        reporter: userResponse,
        livecomment: livecommentResponse,
        created_at: livecommentReport.created_at,
    };
});
exports.fillLivecommentReportResponse = fillLivecommentReportResponse;
