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
exports.fillLivestreamResponse = void 0;
const fill_user_response_1 = require("./fill-user-response");
const fillLivestreamResponse = (conn, livestream, getFallbackUserIcon) => __awaiter(void 0, void 0, void 0, function* () {
    const [[user]] = yield conn.query('SELECT * FROM users WHERE id = ?', [livestream.user_id]);
    if (!user)
        throw new Error('not found user that has the given id');
    const userResponse = yield (0, fill_user_response_1.fillUserResponse)(conn, user, getFallbackUserIcon);
    const [livestreamTags] = yield conn.query('SELECT * FROM livestream_tags WHERE livestream_id = ?', [livestream.id]);
    const tags = [];
    for (const livestreamTag of livestreamTags) {
        const [[tag]] = yield conn.query('SELECT * FROM tags WHERE id = ?', [livestreamTag.tag_id]);
        tags.push(tag);
    }
    return {
        id: livestream.id,
        owner: userResponse,
        title: livestream.title,
        tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
        description: livestream.description,
        playlist_url: livestream.playlist_url,
        thumbnail_url: livestream.thumbnail_url,
        start_at: livestream.start_at,
        end_at: livestream.end_at,
    };
});
exports.fillLivestreamResponse = fillLivestreamResponse;
