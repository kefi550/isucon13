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
exports.GetPaymentResult = void 0;
const throw_error_with_1 = require("../utils/throw-error-with");
// GET /api/payment
const GetPaymentResult = (c) => __awaiter(void 0, void 0, void 0, function* () {
    const conn = yield c.get('pool').getConnection();
    yield conn.beginTransaction();
    try {
        const [[{ 'IFNULL(SUM(tip), 0)': totalTip }]] = yield conn
            .query('SELECT IFNULL(SUM(tip), 0) FROM livecomments')
            .catch((0, throw_error_with_1.throwErrorWith)('failed to count total tip'));
        yield conn.commit().catch((0, throw_error_with_1.throwErrorWith)('failed to commit'));
        return c.json({ totalTip: totalTip });
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
exports.GetPaymentResult = GetPaymentResult;
