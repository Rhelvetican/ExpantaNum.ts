import { Option, Sign, SuperNum } from "./Utils.ts"

export enum ExpantaNumSerializationMode {
	Json,
	String,
}

export enum ExpantaNumDebugLevel {
	None,
	Info,
	Debug,
}

export class ExpantaNumConfiguration {
	maxOps: number
	serializationMode: ExpantaNumSerializationMode
	debugLevel: ExpantaNumDebugLevel

	static Default = new ExpantaNumConfiguration(1e3, ExpantaNumSerializationMode.Json, ExpantaNumDebugLevel.None)

	constructor(maxOps: number, serializationMode: ExpantaNumSerializationMode, debug: ExpantaNumDebugLevel) {
		this.maxOps = maxOps
		this.serializationMode = serializationMode
		this.debugLevel = debug
	}
}

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER, MAX_E = Math.log10(MAX_SAFE_INTEGER)
const expantaErr = "[ExpantaNum]:", invalidArgs = `${expantaErr} Invalid Arguments:`

export class ExpantaNum implements IntoExpantaNum {
	static Configuration: ExpantaNumConfiguration = ExpantaNumConfiguration.Default
	static Constants = {
		ZERO: ExpantaNum.fromNumber(0),
		ONE: ExpantaNum.fromNumber(1),

		E: ExpantaNum.fromNumber(Math.E),
		LN2: ExpantaNum.fromNumber(Math.LN2),
		LN10: ExpantaNum.fromNumber(Math.LN10),
		LOG2E: ExpantaNum.fromNumber(Math.LOG2E),
		LOG10E: ExpantaNum.fromNumber(Math.LOG10E),
		PI: ExpantaNum.fromNumber(Math.PI),
		SQRT1_2: ExpantaNum.fromNumber(Math.SQRT1_2),
		SQRT2: ExpantaNum.fromNumber(Math.SQRT2),

		MAX_SAFE_INTEGER: ExpantaNum.fromNumber(Number.MAX_SAFE_INTEGER),
		MIN_SAFE_INTEGER: ExpantaNum.fromNumber(Number.MIN_SAFE_INTEGER),

		NaN: ExpantaNum.fromNumber(Number.NaN),
		NEGATIVE_INFINITY: ExpantaNum.fromNumber(Number.NEGATIVE_INFINITY),
		POSITIVE_INFINITY: ExpantaNum.fromNumber(Number.POSITIVE_INFINITY),

		E_MAX_SAFE_INTEGER: "e" + Number.MAX_SAFE_INTEGER,
		EE_MAX_SAFE_INTEGER: "ee" + Number.MAX_SAFE_INTEGER,
		TETRATED_MAX_SAFE_INTEGER: "10^^" + Number.MAX_SAFE_INTEGER,
	}

	static isExpantaNum =
		/^[-\+]*(Infinity|NaN|(J+|J\^\d+ )?(10(\^+|\{[1-9]\d*\})|\(10(\^+|\{[1-9]\d*\})\)\^[1-9]\d* )*((\d+(\.\d*)?|\d*\.\d+)?([Ee][-\+]*))*(0|\d+(\.\d*)?|\d*\.\d+))$/

	sign: Sign
	array: Array<SuperNum>
	layer: number

	static configure(cfg: ExpantaNumConfiguration) {
		this.Configuration = cfg
	}

	constructor(sign?: Sign, array?: Array<SuperNum>, layer?: number) {
		this.sign = sign ? sign : new Sign()
		this.array = array ? array : []
		this.layer = layer ? layer : 0
	}

	clone() {
		const clone = new ExpantaNum()

		clone.array = structuredClone(this.array)
		clone.layer = this.layer
		clone.sign = this.sign

		return clone
	}

	toExpantaNum() {
		return new Option(this.clone())
	}

	getOperatorIndex(i: number) {
		if (!isFinite(i)) throw new Error(`${invalidArgs} Index out of range.`)
		let min = 0, max = this.array.length - 1

		if (this.array[max].operator < i) return max + 0.5
		if (this.array[min].operator > i) return -0.5
		while (min != max) {
			if (this.array[min].operator == i) return min
			if (this.array[max].operator == i) return max

			const mid = Math.floor((min + max) / 2)
			if (min == mid || this.array[mid].operator == 1) {
				min = mid
				break
			}

			if (this.array[mid].operator < i) min = mid
			if (this.array[mid].operator > i) max = mid
		}

		return this.array[min].operator == i ? min : min + 0.5
	}

	getOperator(i: number) {
		if (!isFinite(i)) throw new Error(`${invalidArgs} Index out of range.`)
		const idx = this.getOperatorIndex(i)

		if (Number.isInteger(idx)) return this.array[idx].base
		else return i === 0 ? 10 : 0
	}

	setOperator(i: number, val: number) {
		if (!isFinite(i)) throw new Error(`${invalidArgs} Index out of range.`)
		const idx = this.getOperatorIndex(i)

		if (Number.isInteger(idx)) this.array[idx].base = val
		else this.array.splice(Math.ceil(idx), 0, new SuperNum(i, val))

		this.normalize()
	}

	operator(i: number, val?: number) {
		if (typeof val === "number") this.setOperator(i, val)
		else this.getOperator(i)
	}

	normalize() {
		let b = false

		if (!this.array.length) this.array = [new SuperNum(0, 0)]
		if (this.layer > MAX_SAFE_INTEGER) {
			this.array = [new SuperNum(0, Infinity)]
			this.layer = 0
			return this
		}

		if (!Number.isInteger(this.layer)) this.layer = Math.floor(this.layer)

		for (let i = 0; i < this.array.length; ++i) {
			const e = this.array[i]

			if (!e.operator) e.operator = 0
			if (e.operator !== 0 && !e.base) {
				this.array.splice(i, 1)
				--i
				continue
			}

			if (isNaN(e.operator) || isNaN(e.base)) {
				this.array = [new SuperNum(0, NaN)]
				return this
			}

			if (!isFinite(e.operator) || !isFinite(e.base)) {
				this.array = [new SuperNum(0, Infinity)]
				return this
			}

			e.operator = Math.floor(e.operator)
			if (e.base !== 0) e.base = Math.floor(e.base)
		}

		do {
			b = false
			this.array.sort((a, b) => a.operator > b.operator ? 1 : a.operator < b.operator ? -1 : 0)

			if (this.array.length > ExpantaNum.Configuration.maxOps) this.array.splice(0, this.array.length - ExpantaNum.Configuration.maxOps)
			if (!this.array.length) this.array = [new SuperNum(0, 0)]

			if (this.array[this.array.length - 1].operator > MAX_SAFE_INTEGER) {
				this.layer++
				this.array = [new SuperNum(0, this.array[this.array.length - 1].operator)]
				b = true
			} else if (this.array.length == 1 && this.array[0].operator !== 0) {
				this.layer--
				if (this.array[0].base === 0) this.array = [new SuperNum(0, 10)]
				else this.array = [new SuperNum(0, 10), new SuperNum(Math.round(this.array[0].base), 1)]
				b = true
			}

			if (this.array.length < ExpantaNum.Configuration.maxOps && this.array[0].operator !== 0) this.array.unshift(new SuperNum(0, 10))
			for (let i = 0; i < this.array.length - 1; ++i) {
				if (this.array[i].operator == this.array[i + 1].operator) {
					this.array[i].base += this.array[i + 1].base
					this.array.splice(i + 1, 1)
					--i
					b = true
				}
			}

			if (this.array[0].operator === 0 && this.array[0].base > MAX_SAFE_INTEGER) {
				if (this.array.length >= 2 && this.array[1].operator == 1) this.array[1].base++
				else this.array.splice(1, 0, new SuperNum(1, 1))

				this.array[0].base = Math.log10(this.array[0].base)
				b = true
			}

			while (this.array.length >= 2 && this.array[0].operator === 0 && this.array[0].base < MAX_E && this.array[1].operator == 1 && this.array[1].base) {
				this.array[0].base = Math.pow(10, this.array[0].base)

				if (this.array[1].base > 1) this.array[1].base--
				else this.array.splice(1, 1)
				b = true
			}

			while (this.array.length >= 2 && this.array[0].operator === 0 && this.array[0].base == 1 && this.array[1].base) {
				if (this.array[1].base > 1) this.array[1].base--
				else this.array.splice(1, 1)

				this.array[0].base = 10
			}

			if (this.array.length >= 2 && this.array[0].operator === 0 && this.array[1].operator != 1) {
				if (this.array[0].base) this.array.splice(1, 0, new SuperNum(this.array[1].operator - 1, this.array[0].base))

				this.array[0].base = 1

				if (this.array[2].base > 1) this.array[2].base--
				else this.array.splice(2, 1)

				b = true
			}

			for (let i = 1; i < this.array.length; ++i) {
				if (this.array[i].base > MAX_SAFE_INTEGER) {
					if (i != this.array.length - 1 && this.array[i + 1].operator == this.array[i].operator + 1) this.array[i + 1].base++
					else this.array.splice(i + 1, 0, new SuperNum(this.array[i].operator + 1, 1))

					if (this.array[0].operator === 0) this.array[0].base = this.array[i].base + 1
					else this.array.splice(0, 0, new SuperNum(0, this.array[i].base + 1))

					this.array.splice(1, i)
					b = true
				}
			}
		} while (b)

		if (!this.array.length) this.array = [new SuperNum(0, 0)]

		return this
	}

	static fromNumber(n: number) {
		const num = new ExpantaNum()
		num.array = [new SuperNum(0, Math.abs(n))]
		num.sign = new Sign(n)
		return num.normalize()
	}

	static fromBigInt(big: bigint) {
		function log10PosBigInt(input: bigint) {
			let exp = BigInt(64)
			while (input >= BigInt(1) << exp) exp *= BigInt(2)
			let expdel = exp / BigInt(2)

			while (expdel > BigInt(0)) {
				if (input >= BigInt(1) << exp) exp += expdel
				else exp -= expdel
				expdel /= BigInt(2)
			}
			const cutbits = exp - BigInt(54)
			const firstbits = input >> cutbits
			return Math.log10(Number(firstbits)) + Math.LOG10E / Math.LOG2E * Number(cutbits)
		}

		const that = new ExpantaNum()
		const abs = big < BigInt(0) ? -big : big
		that.sign = new Sign(big > BigInt(0))

		if (abs <= MAX_SAFE_INTEGER) that.array[0].base = Number(abs)
		else that.array = [new SuperNum(0, log10PosBigInt(abs)), new SuperNum(1, 1)]

		return that.normalize()
	}

	static fromArray(array: Array<number> | Array<SuperNum>, sgn?: Sign, lyr?: number) {
		const layer = lyr ? lyr : 0, sign = sgn ? sgn : new Sign()
		const that = new ExpantaNum()

		if (!array.length) that.array = [new SuperNum(0, 0)]
		else {
			if (typeof array[0] === "number") {
				for (let i = 0; i < array.length; i++) {
					const item = array[i]
					if (typeof item === "number") that.array.push(new SuperNum(i, item))
					else throw new Error(`${invalidArgs} Invalid Array supplied. Expected Array<number>.`)
				}
			} else if (array[0] instanceof SuperNum) {
				for (let i = 0; i < array.length; i++) {
					const item = array[i]
					if (item instanceof SuperNum) that.array.push(item)
					else throw new Error(`${invalidArgs} Invalid Array supplied. Expected Array<SuperNum>.`)
				}
			}
		}

		that.sign = sign
		that.layer = layer

		return that.normalize()
	}

	static fromObject(o?: object) {
		if (o === null || o === undefined) return ExpantaNum.Constants.ZERO.clone()

		try {
			if (o instanceof Array) return ExpantaNum.fromArray(o)

			if ("array" in o && o.array instanceof Array) {
				if ("sign" in o && "layer" in o && (o.sign instanceof Sign || typeof o.sign === "number") && typeof o.layer === "number") {
					return ExpantaNum.fromArray(o.array, new Sign(o.sign), o.layer)
				} else return ExpantaNum.fromArray(o.array)
			}
		} catch (e) {
			throw e
		}

		throw new Error(`${invalidArgs} Invalid Object supplied.`)
	}

	static fromJson(json: string | object) {
		try {
			if (typeof json === "object") return ExpantaNum.fromObject(json)
			else {
				const parsed = JSON.parse(json)
				return ExpantaNum.fromObject(parsed)
			}
		} catch (e) {
			throw e
		}
	}

	static fromHyperE(hyperE: string) {
		const that = new ExpantaNum()
		if (!/^[-\+]*(0|[1-9]\d*(\.\d*)?|Infinity|NaN|E[1-9]\d*(\.\d*)?(#[1-9]\d*)*)$/.test(hyperE)) {
			console.warn(`${expantaErr} Malformed Input: ${hyperE}`)
			that.array = [new SuperNum(0, NaN)]
			return that
		}

		that.array = [new SuperNum(0, 0)]

		let negateIt = false
		if (hyperE[0] == "-" || hyperE[0] == "+") {
			const numSigns = hyperE.search(/[^-\+]/)
			const signs = hyperE.substring(0, numSigns)
			const matches = new Option(signs.match(/-/g))
			negateIt = matches.map((x) => x.length % 2 === 0).unwrapOr(false)
			hyperE = hyperE.substring(numSigns)
		}

		try {
			if (hyperE == "NaN" || hyperE == "nan") that.array = [new SuperNum(0, NaN)]
			else if (hyperE == "Infinity" || hyperE == "Inf" || hyperE == "inf") that.array = [new SuperNum(0, Infinity)]
			else if (hyperE.startsWith("e") || hyperE.startsWith("E")) that.array[0].base = Number.parseFloat(hyperE)
			else if (hyperE.indexOf("#") == -1) {
				that.array[0].base = Number.parseFloat(hyperE.substring(1))
				that.array[1] = new SuperNum(1, 1)
			} else {
				const arr = hyperE.substring(1).split("#")
				for (let i = 0; i < arr.length; ++i) {
					let t = Number.parseFloat(arr[i])
					if (i >= 2) --t
					that.array[i] = new SuperNum(i, t)
				}
			}
		} catch (e) {
			throw e
		}

		if (negateIt) that.sign = that.sign.flipClone()
		return that.normalize()
	}

	static fromString(s: string) {
		const LONG_STRING_MIN_LENGTH = 17
		const log10LongStr = (s: string) => {
			return Math.log10(
				Option.try(() => Number.parseFloat(s.substring(0, LONG_STRING_MIN_LENGTH))).unwrapOr(0),
			) + (s.length - LONG_STRING_MIN_LENGTH)
		}

		try {
			if (s.startsWith("[") || s.startsWith("{")) {
				try {
					const parsedJson = JSON.parse(s)
					return ExpantaNum.fromObject(parsedJson)
				} catch (_) {
					// Do nothing.
				}
			}

			const that = new ExpantaNum()

			if (!ExpantaNum.isExpantaNum.test(s)) {
				console.warn(`${invalidArgs}: Malformed input.`)
				that.array = [new SuperNum(0, NaN)]
				return that
			}

			let negateIt = false
			if (s[0] == "-" || s[0] == "+") {
				const numSigns = s.search(/[^-\+]/)
				const signs = s.substring(0, numSigns)
				const matches = new Option(signs.match(/-/g))
				negateIt = matches.map((x) => x.length % 2 === 0).unwrapOr(false)
				s = s.substring(numSigns)
			}

			if (s == "NaN" || s == "nan") that.array = [new SuperNum(0, NaN)]
			else if (s == "Infinity" || s == "Inf" || s == "inf") that.array = [new SuperNum(0, Infinity)]
			else {
				let a, b, c, d, i

				if (s.startsWith("J")) {
					if (s.startsWith("^", 1)) {
						a = s.substring(2).search(/[^0-9]/) + 2
						that.layer = Number.parseFloat(s.substring(2, a))
						s = s.substring(a + 1)
					} else {
						a = s.search(/[^J]/)
						that.layer = a
						s = s.substring(a)
					}
				}

				while (s) {
					if (/^\(?10[\^\{]/.test(s)) {
						if (s.startsWith("(")) s = s.substring(1)
						let arrows

						if (s[2] == "^") {
							a = s.substring(2).search(/[^\^]/)
							arrows = a
							b = a + 2
						} else {
							a = s.indexOf("}")
							arrows = Number(s.substring(3, a))
							b = a + 1
						}

						s = s.substring(b)
						if (s.startsWith(")")) {
							a = s.indexOf(" ")
							c = Number(s.substring(2, a))
							s = s.substring(a + 1)
						} else c = 1

						if (arrows == 1) {
							if (that.array.length >= 2 && that.array[1].operator == 1) that.array[1].base += c
							else that.array.splice(1, 0, new SuperNum(1, c))
						} else if (arrows == 2) {
							a = (that.array.length >= 2 && that.array[1].operator == 1) ? that.array[1].base : 0
							b = that.array[0].base

							if (b >= 1e10) ++a
							if (b >= 10) ++a

							that.array[0].base = a
							if (that.array.length >= 2 && that.array[1].operator == 1) that.array.splice(1, 1)
							d = that.getOperatorIndex(2)
							that.array.splice(1, Math.ceil(d) - 1)
							that.array[0].base = a

							if (Number.isInteger(d)) that.array[1].base += c
							else that.array.splice(1, 0, new SuperNum(arrows, c))
						} else {
							break
						}
					}

					a = s.split(/[Ee]/), b = [that.array[0].base, 0], c = 1

					for (i = a.length - 1; i >= 0; --i) {
						if (b[0] < MAX_E && b[1] === 0) b[0] = Math.pow(10, c * b[0])
						else if (c == -1) {
							if (b[1] === 0) b[0] = Math.pow(10, c * b[0])
							else if (b[1] == 1 && b[0] <= Math.log10(Number.MAX_VALUE)) b[0] = Math.pow(10, c * Math.pow(10, b[0]))
							else b[0] = 0

							b[1] = 0
						} else b[1]++

						const item = a[i]
						const decimalPointPos = item.indexOf("."), intVarLen = decimalPointPos == -1 ? item.length : decimalPointPos

						if (b[1] === 0) {
							if (intVarLen >= LONG_STRING_MIN_LENGTH) b = [Math.log10(b[0]) + log10LongStr(item.substring(0, intVarLen)), 1]
							else if (item) b[0] *= Number(a[i])
						} else {
							d = intVarLen >= LONG_STRING_MIN_LENGTH ? log10LongStr(item.substring(0, intVarLen)) : item ? Math.log10(Number(item)) : 0

							if (b[1] == 1) b[0] += d
							else if (b[1] == 2 && b[0] < MAX_E + Math.log10(d)) b[0] += Math.log10(1 + Math.pow(10, Math.log10(d) - b[0]))
						}

						if (b[0] < MAX_E && b[1]) {
							b[0] = Math.pow(10, b[0])
							b[1]--
						} else if (b[0] < MAX_SAFE_INTEGER) {
							b[0] = Math.log10(b[0])
							b[1]++
						}
					}

					that.array[0].base = b[0]

					if (b[1]) {
						if (that.array.length >= 2 && that.array[1].operator == 1) that.array[1].base += b[1]
						else that.array.splice(1, 0, new SuperNum(1, b[1]))
					}
				}
			}

			if (negateIt) that.sign = that.sign.flipClone()
			return that.normalize()
		} catch (e) {
			throw e
		}
	}

	abs() {
		const that = this.clone()
		that.sign = new Sign()
		return that
	}

	neg() {
		const that = this.clone()
		that.sign.flip()
		return that
	}

	cmp<U extends IntoExpantaNum>(o: U) {
		const other = o.toExpantaNum().unwrapOrElse(() => new ExpantaNum())

		if (isNaN(this.array[0].base) || isNaN(other.array[0].base)) return NaN
		if (this.array[0].base == Infinity && other.array[0].base != Infinity) return this.sign.sign
		if (this.array[0].base != Infinity && other.array[0].base == Infinity) return -other.sign.sign
		if (this.array.length == 1 && this.array[0].base === 0 && other.array.length == 1 && other.array[0].base === 0) return 0

		if (this.sign != other.sign) return this.sign.valueOf()

		const m = this.sign.valueOf()
		let r

		if (this.layer > other.layer) r = 1
		else if (this.layer < other.layer) r = -1
		else {
			let e, f

			for (let i = 0, l = Math.min(this.array.length, other.array.length); i < l; ++i) {
				e = this.array[this.array.length - 1 - i]
				f = other.array[other.array.length - 1 - i]
				if (e.operator > f.operator || e.operator == f.operator && e.base > f.base) {
					r = 1
					break
				} else if (e.operator < f.operator || e.operator == f.operator && e.base < f.base) {
					r = -1
					break
				}
			}

			if (!r) {
				if (this.array.length == other.array.length) r = 0
				else if (this.array.length > other.array.length) {
					e = this.array[this.array.length - 1]

					if (e.operator >= 1 || e.base > 10) r = 1
					else r = -1
				} else {
					e = other.array[other.array.length - 1]

					if (e.operator >= 1 || e.base > 10) r = -1
					else r = 1
				}
			}
		}

		return m * r
	}

	isNaN() {
		return isNaN(this.array[0].base)
	}

	isFinite() {
		return isFinite(this.array[0].base)
	}

	gt<U extends IntoExpantaNum>(o: U) {
		return this.cmp(o) > 0
	}

	gte<U extends IntoExpantaNum>(o: U) {
		return this.cmp(o) >= 0
	}

	lt<U extends IntoExpantaNum>(o: U) {
		return this.cmp(o) < 0
	}

	lte<U extends IntoExpantaNum>(o: U) {
		return this.cmp(o) <= 0
	}

	eq<U extends IntoExpantaNum>(o: U) {
		return this.cmp(o) === 0
	}

	neq<U extends IntoExpantaNum>(o: U) {
		return this.cmp(o) !== 0
	}

	eqTolerance<U extends IntoExpantaNum>(o: U, tol?: number) {
		const other = o.toExpantaNum().unwrapOrElse(() => new ExpantaNum()), tolerance = tol ? tol : 1e-7
		if (this.isNaN() || other.isNaN() || !this.isFinite() || !other.isFinite() || this.sign == other.sign || Math.abs(this.layer - other.layer) > 1) {
			return false
		}
	}
}
