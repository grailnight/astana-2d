--!strict
-- Клиент: интерфейс (деньги, потребности, подсказка), диалоги, метка доставки, снег.
-- Рассчитан на телефон: крупные кнопки, всё масштабируется под экран.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local Logic = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Logic"))

local StateEvent = remotes:WaitForChild("State") :: RemoteEvent
local ToastEvent = remotes:WaitForChild("Toast") :: RemoteEvent
local DialogEvent = remotes:WaitForChild("Dialog") :: RemoteEvent
local DialogReply = remotes:WaitForChild("DialogReply") :: RemoteEvent
local FadeEvent = remotes:WaitForChild("Fade") :: RemoteEvent

local INK = Color3.fromRGB(22, 28, 40)
local PANEL = Color3.fromRGB(30, 38, 54)
local ACCENT = Color3.fromRGB(46, 196, 230)
local GOLD = Color3.fromRGB(255, 214, 110)
local WHITE = Color3.fromRGB(245, 248, 252)

local function make(class: string, props: { [string]: any }, parent: Instance?): any
	local instance = Instance.new(class)
	for key, value in props do
		(instance :: any)[key] = value
	end
	instance.Parent = parent
	return instance
end

local function round(parent: Instance, radius: number)
	make("UICorner", { CornerRadius = UDim.new(0, radius) }, parent)
end

local function text(props: { [string]: any }, parent: Instance): TextLabel
	local base = {
		BackgroundTransparency = 1,
		Font = Enum.Font.GothamMedium,
		TextColor3 = WHITE,
		TextSize = 16,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextWrapped = true,
	}
	for key, value in props do
		base[key] = value
	end
	return make("TextLabel", base, parent)
end

local screen = make("ScreenGui", { Name = "Astana", ResetOnSpawn = false, DisplayOrder = 5 }, playerGui)
local scale = make("UIScale", {}, screen)
local scales: { UIScale } = {}

local function rescale()
	local camera = workspace.CurrentCamera
	if camera then
		scale.Scale = math.clamp(camera.ViewportSize.Y / 520, 0.62, 1.5)
		for _, other in scales do
			other.Scale = scale.Scale
		end
	end
end
rescale()
if workspace.CurrentCamera then
	workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(rescale)
end

-- Панель слева: деньги, время, шкалы.
local hud = make("Frame", {
	Position = UDim2.fromOffset(10, 8),
	Size = UDim2.fromOffset(230, 150),
	BackgroundColor3 = PANEL,
	BackgroundTransparency = 0.15,
	BorderSizePixel = 0,
}, screen)
round(hud, 12)
local moneyLabel = text({ Position = UDim2.fromOffset(12, 6), Size = UDim2.fromOffset(206, 28), Font = Enum.Font.GothamBold, TextSize = 24, TextColor3 = GOLD, Text = "…" }, hud)
local timeLabel = text({ Position = UDim2.fromOffset(12, 34), Size = UDim2.fromOffset(206, 18), TextSize = 14, Text = "" }, hud)
local skillLabel = text({ Position = UDim2.fromOffset(12, 126), Size = UDim2.fromOffset(206, 18), TextSize = 13, TextColor3 = Color3.fromRGB(190, 200, 216), Text = "" }, hud)

local function bar(name: string, y: number, color: Color3): Frame
	text({ Position = UDim2.fromOffset(12, y), Size = UDim2.fromOffset(58, 18), TextSize = 13, Text = name }, hud)
	local back = make("Frame", { Position = UDim2.fromOffset(72, y + 3), Size = UDim2.fromOffset(146, 12), BackgroundColor3 = INK, BorderSizePixel = 0 }, hud)
	round(back, 6)
	local fill = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = color, BorderSizePixel = 0 }, back)
	round(fill, 6)
	return fill
end
local warmthBar = bar("Тепло", 58, Color3.fromRGB(255, 140, 80))
local foodBar = bar("Еда", 80, Color3.fromRGB(120, 210, 110))
local energyBar = bar("Силы", 102, ACCENT)

-- Подсказка «что делать дальше» сверху по центру.
local goalFrame = make("Frame", {
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 60, 0, 8),
	Size = UDim2.fromOffset(380, 44),
	BackgroundColor3 = PANEL,
	BackgroundTransparency = 0.15,
	BorderSizePixel = 0,
}, screen)
round(goalFrame, 12)
local goalLabel = text({ Position = UDim2.fromOffset(12, 2), Size = UDim2.new(1, -24, 1, -4), TextSize = 14, Text = "" }, goalFrame)

-- Всплывающие сообщения.
local toasts = make("Frame", {
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 60, 0, 60),
	Size = UDim2.fromOffset(380, 200),
	BackgroundTransparency = 1,
}, screen)
make("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, toasts)
local toastOrder = 0

local function toast(message: string)
	toastOrder += 1
	local label = text({
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundTransparency = 0.1,
		BackgroundColor3 = INK,
		TextSize = 15,
		Text = message,
		LayoutOrder = toastOrder,
	}, toasts)
	round(label, 10)
	make("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10), PaddingTop = UDim.new(0, 7), PaddingBottom = UDim.new(0, 7) }, label)
	local children = toasts:GetChildren()
	local labels = 0
	for _, child in children do
		if child:IsA("TextLabel") then
			labels += 1
		end
	end
	if labels > 3 then
		for _, child in children do
			if child:IsA("TextLabel") then
				child:Destroy()
				break
			end
		end
	end
	task.delay(5, function()
		if label.Parent then
			local tween = TweenService:Create(label, TweenInfo.new(0.4), { BackgroundTransparency = 1, TextTransparency = 1 })
			tween:Play()
			task.wait(0.45)
			label:Destroy()
		end
	end)
end

-- Диалоговое окно.
local shade = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 0.55, BorderSizePixel = 0, Visible = false, Active = true }, make("ScreenGui", { Name = "AstanaDialog", ResetOnSpawn = false, DisplayOrder = 10, IgnoreGuiInset = true }, playerGui))
local dialogScale = make("UIScale", { Scale = scale.Scale }, shade.Parent)
table.insert(scales, dialogScale)
local holder = make("Frame", {
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.fromOffset(440, 0),
	AutomaticSize = Enum.AutomaticSize.Y,
	BackgroundColor3 = PANEL,
	BorderSizePixel = 0,
}, shade)
round(holder, 14)
local dialog = make("Frame", { Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1 }, holder)
make("UIPadding", { PaddingLeft = UDim.new(0, 16), PaddingRight = UDim.new(0, 16), PaddingTop = UDim.new(0, 12), PaddingBottom = UDim.new(0, 14) }, dialog)
make("UIListLayout", { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder }, dialog)
local dialogTitle = text({ Size = UDim2.new(1, -40, 0, 26), Font = Enum.Font.GothamBold, TextSize = 20, TextColor3 = GOLD, LayoutOrder = 1, Text = "" }, dialog)
local dialogText = text({ Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, TextSize = 16, LayoutOrder = 2, Text = "" }, dialog)
local optionList = make("ScrollingFrame", {
	Size = UDim2.new(1, 0, 0, 100),
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	ScrollBarThickness = 5,
	CanvasSize = UDim2.fromOffset(0, 0),
	AutomaticCanvasSize = Enum.AutomaticSize.Y,
	LayoutOrder = 3,
}, dialog)
make("UIListLayout", { Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder }, optionList)
local closeButton = make("TextButton", {
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -8, 0, 8),
	Size = UDim2.fromOffset(36, 36),
	BackgroundColor3 = INK,
	BorderSizePixel = 0,
	Font = Enum.Font.GothamBold,
	TextSize = 20,
	TextColor3 = WHITE,
	Text = "×",
	ZIndex = 3,
}, holder)
round(closeButton, 18)

local currentId: number? = nil
local dialogToken = 0

local function clearOptions()
	for _, child in optionList:GetChildren() do
		if child:IsA("GuiButton") then
			child:Destroy()
		end
	end
end

local function closeDialog()
	currentId = nil
	dialogToken += 1
	shade.Visible = false
	clearOptions()
end

local function reply(value: any)
	local id = currentId
	if id then
		closeDialog()
		DialogReply:FireServer(id, value)
	end
end

local function optionButton(label: string, order: number, onClick: () -> ()): TextButton
	local button = make("TextButton", {
		Size = UDim2.new(1, -8, 0, 42),
		AutomaticSize = Enum.AutomaticSize.Y,
		BackgroundColor3 = Color3.fromRGB(52, 66, 94),
		BorderSizePixel = 0,
		AutoButtonColor = true,
		Font = Enum.Font.GothamMedium,
		TextSize = 16,
		TextColor3 = WHITE,
		TextWrapped = true,
		Text = label,
		LayoutOrder = order,
	}, optionList)
	round(button, 10)
	make("UIPadding", { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10), PaddingTop = UDim.new(0, 6), PaddingBottom = UDim.new(0, 6) }, button)
	button.Activated:Connect(onClick)
	return button
end

local function fitOptions(count: number)
	optionList.Size = UDim2.new(1, 0, 0, math.min(count * 48, 250))
end

local function showChoice(data: any)
	dialogTitle.Text = data.title
	dialogText.Text = data.text
	clearOptions()
	for index, option in data.options do
		optionButton(option, index, function()
			reply(index)
		end)
	end
	fitOptions(#data.options)
end

-- Мини-игра бариста: запомнить порядок, затем повторить.
local function showSequence(data: any)
	local token = dialogToken
	local names: { string } = data.options
	local order: { number } = data.order
	local recipe = {}
	for i, index in order do
		recipe[i] = names[index]
	end
	dialogTitle.Text = data.title
	dialogText.Text = "Запомни рецепт:\n" .. table.concat(recipe, "  →  ")
	clearOptions()
	fitOptions(0)
	task.delay(data.show or 3, function()
		if token ~= dialogToken then
			return
		end
		local picked: { number } = {}
		local function refresh()
			local shown = {}
			for i, index in picked do
				shown[i] = names[index]
			end
			dialogText.Text = `Повтори рецепт ({#picked}/{#order}):\n` .. table.concat(shown, "  →  ")
		end
		refresh()
		for index, name in names do
			optionButton(name, index, function()
				table.insert(picked, index)
				if #picked >= #order then
					reply(picked)
				else
					refresh()
				end
			end)
		end
		fitOptions(#names)
	end)
end

DialogEvent.OnClientEvent:Connect(function(data: any)
	if data.kind == "close" then
		if currentId == data.id then
			closeDialog()
		end
		return
	end
	closeDialog()
	currentId = data.id
	shade.Visible = true
	if data.kind == "sequence" then
		showSequence(data)
	else
		showChoice(data)
	end
end)

closeButton.Activated:Connect(function()
	reply(nil)
end)

-- Затемнение экрана (сон, автобус, обморок).
local fadeGui = make("ScreenGui", { Name = "AstanaFade", ResetOnSpawn = false, DisplayOrder = 20, IgnoreGuiInset = true }, playerGui)
local fadeFrame = make("Frame", { Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.new(0, 0, 0), BackgroundTransparency = 1, BorderSizePixel = 0, Visible = false }, fadeGui)
local fadeLabel = text({ Size = UDim2.fromScale(1, 1), TextSize = 26, Font = Enum.Font.GothamBold, TextXAlignment = Enum.TextXAlignment.Center, TextTransparency = 1, Text = "" }, fadeFrame)
local fadeToken = 0

FadeEvent.OnClientEvent:Connect(function(message: string, seconds: number)
	fadeToken += 1
	local token = fadeToken
	fadeLabel.Text = message
	fadeFrame.Visible = true
	TweenService:Create(fadeFrame, TweenInfo.new(0.4), { BackgroundTransparency = 0 }):Play()
	TweenService:Create(fadeLabel, TweenInfo.new(0.4), { TextTransparency = 0 }):Play()
	task.wait(math.max(0.5, seconds - 0.4))
	if token ~= fadeToken then
		return
	end
	TweenService:Create(fadeFrame, TweenInfo.new(0.5), { BackgroundTransparency = 1 }):Play()
	TweenService:Create(fadeLabel, TweenInfo.new(0.5), { TextTransparency = 1 }):Play()
	task.wait(0.55)
	if token == fadeToken then
		fadeFrame.Visible = false
	end
end)

-- Метка доставки.
local marker = make("Part", {
	Name = "DeliveryMarker",
	Anchored = true,
	CanCollide = false,
	CanQuery = false,
	CanTouch = false,
	Material = Enum.Material.Neon,
	Color = GOLD,
	Transparency = 0.45,
	Shape = Enum.PartType.Cylinder,
	Size = Vector3.new(60, 5, 5),
})
local markerGui = make("BillboardGui", { Size = UDim2.fromOffset(260, 44), StudsOffset = Vector3.new(0, 0, 0), AlwaysOnTop = true, LightInfluence = 0 }, marker)
local markerLabel = text({ Size = UDim2.fromScale(1, 1), TextSize = 16, Font = Enum.Font.GothamBold, TextColor3 = GOLD, TextStrokeTransparency = 0.2, TextXAlignment = Enum.TextXAlignment.Center, Text = "" }, markerGui)
local target: { x: number, z: number, name: string }? = nil

-- Снег.
local snow = make("Part", { Name = "Snow", Anchored = true, CanCollide = false, CanQuery = false, CanTouch = false, Transparency = 1, Size = Vector3.new(150, 1, 150) }, workspace)
local flakes = make("ParticleEmitter", {
	Rate = 220,
	Lifetime = NumberRange.new(5, 7),
	Speed = NumberRange.new(12, 18),
	EmissionDirection = Enum.NormalId.Bottom,
	SpreadAngle = Vector2.new(12, 12),
	Size = NumberSequence.new(0.3),
	Color = ColorSequence.new(Color3.new(1, 1, 1)),
	Transparency = NumberSequence.new(0.15),
	LightEmission = 0.5,
	Acceleration = Vector3.new(3, 0, 1),
}, snow)

local function ratio(value: number): UDim2
	return UDim2.fromScale(math.clamp(value / 100, 0, 1), 1)
end

StateEvent.OnClientEvent:Connect(function(state: any)
	moneyLabel.Text = Logic.money(state.money)
	local weather = if state.buran then "буран" else (if state.indoors then "в тепле" else "мороз")
	timeLabel.Text = `День {state.day} · {state.clock} · {state.temp}° · {weather}`
	skillLabel.Text = `Казахский {state.kaz} · Код {state.code}` .. (if state.debt > 0 then ` · долг {Logic.money(state.debt)}` else "")
	warmthBar.Size = ratio(state.warmth)
	foodBar.Size = ratio(state.food)
	energyBar.Size = ratio(state.energy)
	goalLabel.Text = "Цель: " .. state.goal

	target = state.target
	if target then
		marker.CFrame = CFrame.new(target.x, 30, target.z) * CFrame.Angles(0, 0, math.rad(90))
		marker.Parent = workspace
	else
		marker.Parent = nil
	end

	flakes.Enabled = not state.indoors
	flakes.Rate = if state.buran then 900 else 220
	flakes.Acceleration = if state.buran then Vector3.new(40, 0, 14) else Vector3.new(3, 0, 1)
end)

ToastEvent.OnClientEvent:Connect(toast)

local elapsed = 0
RunService.RenderStepped:Connect(function(dt: number)
	local camera = workspace.CurrentCamera
	if not camera then
		return
	end
	snow.CFrame = CFrame.new(camera.CFrame.Position + Vector3.new(0, 40, 0))
	elapsed += dt
	if elapsed < 0.2 then
		return
	end
	elapsed = 0
	local goal = target
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if goal and root and root:IsA("BasePart") then
		local distance = (Vector3.new(goal.x, root.Position.Y, goal.z) - root.Position).Magnitude
		markerLabel.Text = `▼ {goal.name} · {math.floor(distance / 3.5)} м`
	end
end)
