export class Option<T> {
	data: T | null

	constructor(data?: T | null) {
		if (data === undefined) {
			this.data = null
			return
		}

		this.data = data
	}

	// deno-lint-ignore no-explicit-any
	static try<T>(fn: (...args: any[]) => T, ...args: any[]): Option<T> {
		try {
			const maybe = fn(...args)
			return new Option(maybe)
		} catch (_) {
			return new Option()
		}
	}

	map<U>(fn: (arg: T) => U): Option<U> {
		if (this.data === null) return new Option()
		else return new Option(fn(this.data))
	}

	isNone() {
		return this.data === null
	}

	isNoneOr(pred: (arg: T) => boolean) {
		return this.data === null || pred(this.data)
	}

	isSome() {
		return this.data !== null
	}

	isSomeAnd(pred: (arg: T) => boolean) {
		return this.data !== null && pred(this.data)
	}

	unwrap(): T {
		if (this.data === null) throw new Error("Unwrapped a null value.")
		else return this.data
	}

	unwrapOr(defaultValue: T): T {
		if (this.data === null) return defaultValue
		else return this.data
	}

	unwrapOrElse(defaultValueFunc: () => T): T {
		if (this.data === null) return defaultValueFunc()
		else return this.data
	}
}

export class SuperNum {
	operator: number = 0
	base: number = 0

	constructor(operator: number, base: number) {
		this.operator = operator
		this.base = base
	}
}

export class Sign {
	sign: 1 | -1

	static Positive = new Sign()
	static Negative = new Sign(-1)

	constructor(sign?: number | boolean | Sign) {
		if (typeof sign === "number") this.sign = sign > 0 ? 1 : -1
		else if (typeof sign === "boolean") this.sign = sign ? 1 : -1
		else if (sign instanceof Sign) this.sign = sign.sign
		else this.sign = 1
	}

	isPositive() {
		return this.sign === 1
	}

	isNegative() {
		return this.sign === -1
	}

	flipClone() {
		return new Sign(this.sign < 0)
	}

	flip() {
		this.sign *= -1
	}

	valueOf() {
		return this.sign
	}

	clone() {
		return new Sign(this.sign)
	}
}
