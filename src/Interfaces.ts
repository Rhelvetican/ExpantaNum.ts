import { ExpantaNum } from "ExpantaNum"
import { Option } from "./Utils.ts"

declare global {
	interface IntoExpantaNum {
		toExpantaNum(): Option<ExpantaNum>
	}

	interface Number extends IntoExpantaNum {}
	interface BigInt extends IntoExpantaNum {}
	interface String extends IntoExpantaNum {}
	interface Object extends IntoExpantaNum {}
}

Number.prototype.toExpantaNum = function () {
	return new Option(ExpantaNum.fromNumber(this.valueOf()))
}

BigInt.prototype.toExpantaNum = function () {
	return new Option(ExpantaNum.fromBigInt(this.valueOf()))
}

String.prototype.toExpantaNum = function () {
	return Option.try(() => ExpantaNum.fromString(this.valueOf()))
}

Object.prototype.toExpantaNum = function () {
	return Option.try(() => ExpantaNum.fromObject(this.valueOf()))
}
