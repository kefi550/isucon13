"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwErrorWith = void 0;
/**
 * エラーの情報にメッセージを付与して、再度エラーを投げる関数
 * @param message エラーに付与する文字列
 *
 * @example
 * await fetch('https://example.com').catch(throwErrorWith('GET https://example.com failed'))
 * // => GET https://example.com failed
 * //    TypeError: Failed to fetch
 */
const throwErrorWith = (message) => (error) => {
    throw `${message}\n${error}`;
};
exports.throwErrorWith = throwErrorWith;
