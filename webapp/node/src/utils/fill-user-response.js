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
exports.fillUserResponse = void 0;
const node_crypto_1 = require("node:crypto");
const fillUserResponse = (conn, user, getFallbackUserIcon) => __awaiter(void 0, void 0, void 0, function* () {
    const [[theme]] = yield conn.query('SELECT * FROM themes WHERE user_id = ?', [user.id]);
    const [[icon]] = yield conn.query('SELECT image FROM icons WHERE user_id = ?', [user.id]);
    let image = icon === null || icon === void 0 ? void 0 : icon.image;
    if (!image) {
        image = yield getFallbackUserIcon();
    }
    return {
        id: user.id,
        name: user.name,
        display_name: user.display_name,
        description: user.description,
        theme: {
            id: theme.id,
            dark_mode: !!theme.dark_mode,
        },
        icon_hash: (0, node_crypto_1.createHash)('sha256').update(new Uint8Array(image)).digest('hex'),
    };
});
exports.fillUserResponse = fillUserResponse;
