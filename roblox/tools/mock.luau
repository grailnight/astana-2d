-- Упрощённая имитация Roblox API для тестов: позволяет запустить серверный и клиентский
-- скрипты в обычном Luau и прогнать игровые сценарии без Roblox Studio.
-- Имитация не проверяет имена свойств — она ловит ошибки логики, а не опечатки в API.

local errors = {}
local now = 0
local queue = {}
local order = 0

local function report(co, err)
	table.insert(errors, tostring(err) .. "\n" .. debug.traceback(co))
end

local function resume(co, ...)
	local ok, err = coroutine.resume(co, ...)
	if not ok then
		report(co, err)
	end
end

local task = {}
function task.spawn(f, ...)
	local co = if type(f) == "thread" then f else coroutine.create(f)
	resume(co, ...)
	return co
end
task.defer = task.spawn
function task.delay(t, f, ...)
	order += 1
	table.insert(queue, { at = now + t, order = order, co = coroutine.create(f), args = table.pack(...) })
end
function task.wait(t)
	order += 1
	table.insert(queue, { at = now + (t or 0.03), order = order, co = coroutine.running(), args = table.pack() })
	return coroutine.yield()
end

local function advance(dt)
	local limit = now + dt
	while true do
		local best = nil
		for i, item in queue do
			if item.at <= limit and (not best or item.at < queue[best].at or (item.at == queue[best].at and item.order < queue[best].order)) then
				best = i
			end
		end
		if not best then
			break
		end
		local item = table.remove(queue, best)
		now = math.max(now, item.at)
		resume(item.co, table.unpack(item.args, 1, item.args.n))
	end
	now = limit
end

-- Сигналы
local Signal = {}
Signal.__index = Signal
local function newSignal()
	return setmetatable({ handlers = {} }, Signal)
end
function Signal:Connect(fn)
	local connection = { fn = fn }
	table.insert(self.handlers, connection)
	function connection.Disconnect()
		local i = table.find(self.handlers, connection)
		if i then
			table.remove(self.handlers, i)
		end
	end
	return connection
end
function Signal:Fire(...)
	for _, connection in table.clone(self.handlers) do
		task.spawn(connection.fn, ...)
	end
end

-- Математика
local Vector3 = {}
local V3 = {}
local function vec(x, y, z)
	return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0 }, V3)
end
V3.__index = function(self, key)
	if key == "Magnitude" then
		return math.sqrt(self.X ^ 2 + self.Y ^ 2 + self.Z ^ 2)
	end
	return nil
end
V3.__add = function(a, b) return vec(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end
V3.__sub = function(a, b) return vec(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end
V3.__mul = function(a, b)
	if type(a) == "number" then return vec(a * b.X, a * b.Y, a * b.Z) end
	if type(b) == "number" then return vec(a.X * b, a.Y * b, a.Z * b) end
	return vec(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
V3.__div = function(a, b) return vec(a.X / b, a.Y / b, a.Z / b) end
Vector3.new = vec
Vector3.zero = vec(0, 0, 0)

local CF = {}
CF.__index = CF
local function cf(position)
	return setmetatable({ Position = position }, CF)
end
CF.__mul = function(a, b) return cf(a.Position + b.Position) end
CF.__add = function(a, b) return cf(a.Position + b) end
local CFrame = {}
function CFrame.new(x, y, z)
	if type(x) == "table" then return cf(x) end
	return cf(vec(x, y, z))
end
function CFrame.Angles() return cf(vec()) end
function CFrame.lookAt(at) return cf(at) end

local function plain(name)
	return setmetatable({}, { __index = function() return function(...) return { kind = name, args = { ... } } end end })
end
local Vector2 = { new = function(x, y) return { X = x or 0, Y = y or 0 } end }

local enumCache = {}
local function enum(path)
	if not enumCache[path] then
		enumCache[path] = setmetatable({ path = path }, {
			__index = function(_, key) return enum(path .. "." .. key) end,
			__tostring = function() return path end,
		})
	end
	return enumCache[path]
end

local Random = {}
Random.__index = Random
function Random.new(seed)
	return setmetatable({ state = (seed or 12345) % 2147483647 + 1 }, Random)
end
function Random:NextNumber()
	self.state = (self.state * 48271) % 2147483647
	return self.state / 2147483647
end
function Random:NextInteger(a, b)
	return a + math.floor(self:NextNumber() * (b - a + 1))
end

-- Объекты
local SIGNALS = {}
for _, name in { "Triggered", "PlayerAdded", "PlayerRemoving", "CharacterAdded", "OnServerEvent", "OnClientEvent", "Activated", "MouseButton1Click", "RenderStepped", "Heartbeat", "Changed", "Died", "Touched" } do
	SIGNALS[name] = true
end
local PARENTS = {
	Part = "BasePart", SpawnLocation = "BasePart", TextButton = "GuiButton", ImageButton = "GuiButton",
	TextLabel = "GuiObject", Frame = "GuiObject", ScrollingFrame = "GuiObject", GuiButton = "GuiObject",
}

local Methods = {}
local Inst = {}
local services = {}
local localPlayer = nil
local sent = {}
local closers = {}
local stores = {}

local function new(class, name)
	return setmetatable({ ClassName = class, _props = { Name = name or class }, _children = {}, _attrs = {}, _signals = {} }, Inst)
end

Inst.__index = function(self, key)
	local props = rawget(self, "_props")
	if props[key] ~= nil then
		return props[key]
	end
	if Methods[key] then
		return Methods[key]
	end
	if SIGNALS[key] then
		local signals = rawget(self, "_signals")
		signals[key] = signals[key] or newSignal()
		return signals[key]
	end
	if key == "Position" and props.CFrame then
		return props.CFrame.Position
	end
	return Methods.FindFirstChild(self, key)
end

Inst.__newindex = function(self, key, value)
	local props = rawget(self, "_props")
	if key == "Parent" then
		local old = props.Parent
		if old then
			local list = rawget(old, "_children")
			local i = table.find(list, self)
			if i then table.remove(list, i) end
		end
		props.Parent = value
		if value then
			table.insert(rawget(value, "_children"), self)
			if self.ClassName == "Player" and value.ClassName == "Players" then
				value.PlayerAdded:Fire(self)
			end
		end
		return
	end
	if key == "Position" then
		props.CFrame = cf(value)
		return
	end
	props[key] = value
end

function Methods:IsA(class)
	local current = self.ClassName
	while current do
		if current == class then return true end
		current = PARENTS[current]
	end
	return class == "Instance"
end
function Methods:FindFirstChild(name)
	for _, child in rawget(self, "_children") do
		if rawget(child, "_props").Name == name then return child end
	end
	return nil
end
function Methods:FindFirstChildOfClass(class)
	for _, child in rawget(self, "_children") do
		if child.ClassName == class then return child end
	end
	return nil
end
function Methods:WaitForChild(name)
	local child = Methods.FindFirstChild(self, name)
	if not child then
		error("WaitForChild: нет объекта " .. tostring(name) .. " в " .. tostring(self.Name), 2)
	end
	return child
end
function Methods:GetChildren() return table.clone(rawget(self, "_children")) end
function Methods:GetPlayers()
	local list = {}
	for _, child in rawget(self, "_children") do
		if child.ClassName == "Player" then table.insert(list, child) end
	end
	return list
end
function Methods:Destroy() self.Parent = nil end
function Methods:SetAttribute(key, value) rawget(self, "_attrs")[key] = value end
function Methods:GetAttribute(key) return rawget(self, "_attrs")[key] end
function Methods:GetPropertyChangedSignal() return newSignal() end
function Methods:PivotTo(target)
	local root = Methods.FindFirstChild(self, "HumanoidRootPart")
	if root then root.CFrame = target end
end
function Methods:BindToClose(fn) table.insert(closers, fn) end
function Methods:IsStudio() return false end
function Methods:Kick(message) self._props.kicked = message or true; self.Parent = nil end
function Methods:FireClient(player, ...)
	sent[player] = sent[player] or {}
	table.insert(sent[player], { event = self.Name, args = { ... } })
	if player == localPlayer then
		self.OnClientEvent:Fire(...)
	end
end
function Methods:FireServer(...)
	self.OnServerEvent:Fire(localPlayer, ...)
end
function Methods:Create() return { Play = function() end } end
function Methods:Play() end
function Methods:GetDataStore(name)
	if rawget(self, "_failStore") then error("DataStore недоступен") end
	stores[name] = stores[name] or {}
	local data = stores[name]
	local function copy(value)
		if type(value) ~= "table" then return value end
		local out = {}
		for k, v in value do out[k] = copy(v) end
		return out
	end
	return {
		GetAsync = function(_, key) return copy(data[key]) end,
		SetAsync = function(_, key, value) data[key] = copy(value) end,
		UpdateAsync = function(_, key, transform)
			local result = transform(copy(data[key]))
			if result ~= nil then
				data[key] = copy(result)
			end
			return copy(result)
		end,
	}
end
function Methods:GetService(name)
	if not services[name] then
		local service = new(name, name)
		services[name] = service
		service.Parent = self
	end
	return services[name]
end

local game = new("DataModel", "game")
game.JobId = "test-server"
local workspace = game:GetService("Workspace")
local camera = new("Camera")
camera.ViewportSize = Vector2.new(800, 360)
camera.CFrame = cf(vec(0, 10, 0))
camera.Parent = workspace
workspace.CurrentCamera = camera

local Instance = { new = function(class) return new(class) end }

local function addPlayer(name, userId, isLocal)
	local player = new("Player", name)
	player.DisplayName = name
	player.UserId = userId
	new("PlayerGui", "PlayerGui").Parent = player
	local character = new("Model", name)
	local root = new("Part", "HumanoidRootPart")
	root.CFrame = cf(vec(-230, 3, -132))
	root.Parent = character
	local humanoid = new("Humanoid", "Humanoid")
	humanoid.WalkSpeed = 16
	humanoid.Parent = character
	player.Character = character
	if isLocal then
		localPlayer = player
		game:GetService("Players").LocalPlayer = player
	end
	player.Parent = game:GetService("Players")
	return player
end

local function removePlayer(player)
	game:GetService("Players").PlayerRemoving:Fire(player)
	player.Parent = nil
end

-- Модули
local definitions = {}
local loaded = {}
function __define(name, fn)
	definitions[name] = fn
end
local function require(module)
	local name = module.Name
	if loaded[name] == nil then
		local fn = definitions[name] or error("нет модуля " .. tostring(name))
		loaded[name] = fn(module)
	end
	return loaded[name]
end

__mock = {
	game = game, workspace = workspace, Instance = Instance, Vector3 = Vector3, CFrame = CFrame, Vector2 = Vector2,
	Color3 = plain("Color3"), UDim2 = plain("UDim2"), UDim = plain("UDim"), NumberRange = plain("NumberRange"),
	NumberSequence = plain("NumberSequence"), ColorSequence = plain("ColorSequence"),
	PhysicalProperties = plain("PhysicalProperties"), TweenInfo = plain("TweenInfo"),
	Enum = enum("Enum"), Random = Random, task = task, require = require,
	warn = function(...) table.insert(errors, "warn: " .. table.concat({ ... }, " ")) end,
	os = { clock = function() return now end, time = function() return math.floor(now) end },
	-- управление тестом
	new = new, advance = advance, errors = errors, sent = sent, stores = stores, closers = closers,
	addPlayer = addPlayer, removePlayer = removePlayer, definitions = definitions, services = services,
}
