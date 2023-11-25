"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.atoi = void 0;
/**
 * Goのstrconv.Atoiを模した関数
 * Integerを変換した値を返す
 * Integerに変換できない値が来たときはfalseを返す
 */
const atoi = (string_) => {
    const number_ = Number(string_);
    const isInt = Number.isInteger(number_);
    if (isInt)
        return number_;
    return false;
};
exports.atoi = atoi;
