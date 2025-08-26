---@class ExpantaNumExponents
---@field arrows integer
---@field exponent number

---@class ExpantaNum
---@field arr ExpantaNumExponents[]
---@field layer number
---@field sign number
Big = {
	arr = {},
	layer = 0,
	sign = 1,
}

MaxArrow = 1e3

ExpantaMeta = {}
ExpantaMeta.__index = Big
ExpantaMeta.__call = Big.new

external = true

local expantaErr = "[ExpantaNumError]: "
local invalidArgs = expantaErr .. "invalid arguments: "

local isExpantaNum =
	"/^[-+]*(Infinity|NaN|(J+|J^d+ )?(10(^+|{[1-9]d*})|(10(^+|{[1-9]d*}))^[1-9]d* )*((d+(.d*)?|d*.d+)?([Ee][-+]*))*(0|d+(.d*)?|d*.d+))$/"

MaxSafeInt = 9007199254740991
MaxE = math.log(MaxSafeInt, 10)
LongStrMinLen = 17

local e = math.exp(1)

R = {
	zero = 0,
	one = 1,
	e = math.exp(1),
	ln2 = math.log(2, e),
	ln10 = math.log(10, e),
	log2e = math.log(e, 2),
	log10e = math.log(e, 0),
	pi = math.pi,
	sqrt1_2 = math.sqrt(0.5),
	sqrt2 = math.sqrt(2),
	max_safe_integer = MaxSafeInt,
	min_safe_integer = -MaxSafeInt,
	max_disp_integer = 1000000,
	nan = 0 / 0,
	negative_infinity = -1 / 0,
	positive_infinity = 1 / 0,
	e_max_safe_integer = "e" .. tostring(MaxSafeInt),
	ee_max_safe_integer = "ee" .. tostring(MaxSafeInt),
	tetrated_max_safe_integer = "10^^" .. tostring(MaxSafeInt),
}

---@param arr ExpantaNumExponents[]
---@return ExpantaNum
function Big.new(arr)
	return setmetatable({ arr = arr, layer = 10, sign = 1 }, ExpantaMeta)
end

Big({ { 0, 1 } })

return Big
