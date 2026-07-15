extends Control

const GRID_SIZE := 11
const CELL_SIZE := 40
const MELTDOWN_TEMP := 1500.0
const SIM_TPS := 20.0
const DIRS := [Vector2i(0, 1), Vector2i(0, -1), Vector2i(1, 0), Vector2i(-1, 0)]
const CHANNELS := [
	{"id": "fuel", "label": "Fuel Channel"},
	{"id": "moderated_fuel", "label": "Moderated Fuel"},
	{"id": "control", "label": "Control Rod"},
	{"id": "moderated_control", "label": "Moderated Control"},
	{"id": "auto_control", "label": "Auto Control"},
	{"id": "steam", "label": "Steam Channel"},
	{"id": "graphite", "label": "Graphite"},
	{"id": "reflector", "label": "Reflector"},
	{"id": "absorber", "label": "Boron Absorber"},
	{"id": "irradiation", "label": "Irradiation"},
	{"id": "heater", "label": "Fluid Heater"},
	{"id": "cooler", "label": "Cooler"},
	{"id": "structural", "label": "Structural"},
]

const STEAM_TYPES := [
	{"id": "steam", "label": "Steam 100C", "min_temp": 100.0, "mb_per_tick": 1000},
	{"id": "dense_steam", "label": "Dense 300C", "min_temp": 300.0, "mb_per_tick": 800},
	{"id": "super_dense_steam", "label": "Super Dense 450C", "min_temp": 450.0, "mb_per_tick": 600},
	{"id": "ultra_dense_steam", "label": "Ultra Dense 600C", "min_temp": 600.0, "mb_per_tick": 400},
]

var fuels := []
var fuel_by_id := {}
var texture_by_type := {}
var fuel_texture_by_id := {}
var control_texture_by_group := {}
var console_texture: Texture2D
var design := {}
var sim := {}
var selected_type := "fuel"
var selected_fuel := "ueu"
var selected_steam := "steam"
var selected_cell := Vector2i.ZERO
var edit_mode := "place"
var running := false
var sim_accumulator := 0.0

var grid_container: GridContainer
var cell_buttons := []
var palette_select: OptionButton
var fuel_select: OptionButton
var steam_select: OptionButton
var run_button: Button
var tick_label: Label
var flux_label: Label
var heat_label: Label
var steam_label: Label
var inspector_label: RichTextLabel
var warnings_label: RichTextLabel
var mode_label: Label
var context_menu: PopupPanel
var context_title: Label
var insertion_slider: HSlider
var insertion_value: Label
var group_input: LineEdit
var control_options: VBoxContainer

func _ready() -> void:
	seed_fuels()
	load_textures()
	design = create_design(GRID_SIZE)
	sim = create_simulation_state(GRID_SIZE)
	build_ui()
	render_grid()
	update_all()

func _process(delta: float) -> void:
	if not running:
		return
	sim_accumulator += delta
	while sim_accumulator >= 1.0 / SIM_TPS:
		sim = step_simulation(design, sim)
		sim_accumulator -= 1.0 / SIM_TPS
	update_grid_runtime()
	update_all()

func seed_fuels() -> void:
	fuels = [
		rod("ueu", "Unenriched Uranium", 100000000.0, 15.0, "log_ten", "raising_slope", 0.65, 2865.0),
		rod("meu", "Medium Enriched Uranium-235", 100000000.0, 20.0, "log_ten", "raising_slope", 0.65, 2865.0),
		rod("heu233", "Highly Enriched Uranium-233", 100000000.0, 27.5, "linear", "gentle_slope", 1.25, 2865.0),
		rod("heu235", "Highly Enriched Uranium-235", 100000000.0, 50.0, "square_root", "gentle_slope", 1.0, 2865.0),
		rod("uzh", "Uranium Zirconium Hydride", 50000000.0, 30.0, "log_ten", "gentle_slope", 0.75, 1845.0, 0.0, 0.5, "slow", "fast", 0.1, 1000.0, 500.0),
		rod("thmeu", "Thorium with MEU Driver Fuel", 100000000.0, 20.0, "plateau", "boosted_slope", 0.65, 3350.0),
		rod("lep", "Low Enriched Plutonium-239", 100000000.0, 35.0, "log_ten", "raising_slope", 0.75, 2744.0),
		rod("mep", "Medium Enriched Plutonium-239", 100000000.0, 35.0, "square_root", "gentle_slope", 1.0, 2744.0),
		rod("hep239", "Highly Enriched Plutonium-239", 100000000.0, 30.0, "linear", "gentle_slope", 1.25, 2744.0),
		rod("hep241", "Highly Enriched Plutonium-241", 100000000.0, 40.0, "linear", "gentle_slope", 1.75, 2744.0),
		rod("lea", "Low Enriched Americium-242", 100000000.0, 60.0, "square_root", "raising_slope", 1.5, 2386.0, 10.0),
		rod("mea", "Medium Enriched Americium-242", 100000000.0, 35.0, "negative_quadratic", "gentle_slope", 1.75, 2386.0, 20.0),
		rod("hea241", "Highly Enriched Americium-241", 100000000.0, 65.0, "square_root", "gentle_slope", 1.85, 2386.0, 15.0, 0.5, "fast", "fast"),
		rod("hea242", "Highly Enriched Americium-242", 100000000.0, 45.0, "linear", "gentle_slope", 2.0, 2386.0),
		rod("men", "Medium Enriched Neptunium-237", 100000000.0, 30.0, "square_root", "raising_slope", 0.75, 2800.0, 0.0, 0.5, "any", "fast"),
		rod("hen", "Highly Enriched Neptunium-237", 100000000.0, 40.0, "square_root", "gentle_slope", 1.0, 2800.0, 0.0, 0.5, "fast", "fast"),
		rod("mox", "Mixed MEU & LEP Oxide", 100000000.0, 40.0, "log_ten", "raising_slope", 1.0, 2815.0),
		rod("les", "Low Enriched Schrabidium-326", 100000000.0, 50.0, "square_root", "gentle_slope", 1.25, 2500.0, 0.0, 0.5, "slow", "slow"),
		rod("mes", "Medium Enriched Schrabidium-326", 100000000.0, 75.0, "negative_quadratic", "gentle_slope", 1.5, 2750.0),
		rod("hes", "Highly Enriched Schrabidium-326", 100000000.0, 90.0, "linear", "linear", 1.75, 3000.0),
		rod("leaus", "Low Enriched Australium (Tasmanite)", 100000000.0, 30.0, "sigmoid", "linear", 1.5, 7029.0, 0.0, 0.05),
		rod("heaus", "Highly Enriched Australium (Ayerite)", 100000000.0, 35.0, "linear", "gentle_slope", 1.5, 5211.0, 0.0, 0.05),
		rod("po210be", "Polonium-210 & Beryllium Source", 25000000.0, 0.0, "passive", "linear", 0.1, 1287.0, 50.0, 0.0, "slow", "slow", 0.05),
		rod("ra226be", "Radium-226 & Beryllium Source", 100000000.0, 0.0, "passive", "linear", 0.035, 700.0, 20.0, 0.0, "slow", "slow", 0.5),
		rod("pu238be", "Plutonium-238 & Beryllium Source", 50000000.0, 40.0, "square_root", "gentle_slope", 0.1, 1287.0, 40.0, 0.5, "slow", "slow", 0.05),
		rod("balefire_gold", "Antihydrogen Gold-198 Lattice", 100000000.0, 50.0, "negative_quadratic", "linear", 1.0, 2000.0, 10.0, 0.0),
		rod("flashlead", "Antihydrogen Gold-198/Lead-209 Lattice", 250000000.0, 40.0, "negative_quadratic", "linear", 1.0, 2050.0, 50.0, 0.0),
		rod("balefire", "Draconic Flames", 100000000.0, 100.0, "linear", "gentle_slope", 3.0, 3652.0, 35.0, 0.0),
		rod("zfb_bismuth", "ZFB - LEU/HEP-241#Bi", 50000000.0, 20.0, "square_root", "gentle_slope", 1.75, 2744.0),
		rod("zfb_pu241", "ZFB - HEU-235/HEP-240#Pu-241", 50000000.0, 20.0, "square_root", "gentle_slope", 1.0, 2865.0),
		rod("zfb_am_mix", "ZFB - HEP-241#MEA", 50000000.0, 20.0, "linear", "gentle_slope", 1.75, 2744.0),
		rod("drx", "Digamma", 10000000.0, 1000.0, "quadratic", "gentle_slope", 0.1, 100000.0, 10.0),
	]
	for fuel in fuels:
		fuel_by_id[fuel.id] = fuel

func rod(id: String, name: String, fuel_yield: float, reactivity: float, flux_function: String, decay: String, heat_per_flux: float, melting_point: float, self_rate := 0.0, xenon_gen := 0.5, splits_with := "slow", splits_into := "fast", diffusion := 0.02, heat_coeff_start := 0.0, heat_coeff_length := 0.0) -> Dictionary:
	return {
		"id": id, "name": name, "yield": fuel_yield, "reactivity": reactivity, "flux_function": flux_function,
		"decay": decay, "heat_per_flux": heat_per_flux, "melting_point": melting_point, "self_rate": self_rate,
		"xenon_gen": xenon_gen, "xenon_burn_divisor": 50.0, "splits_with": splits_with, "splits_into": splits_into,
		"diffusion": diffusion, "heat_coeff_start": heat_coeff_start, "heat_coeff_length": heat_coeff_length,
		"self_igniting": self_rate > 0.0 or flux_function == "sigmoid"
	}

func load_textures() -> void:
	var base := "res://assets/textures/rbmk/"
	var columns := "res://assets/textures/columns/"
	console_texture = load("res://assets/textures/rbmk-gui/gui_rbmk_console.png")
	texture_by_type = {
		"empty": load(base + "rbmk_top.png"),
		"fuel": load(base + "rbmk_element_top.png"),
		"moderated_fuel": load(base + "rbmk_element_mod_top.png"),
		"control": load(columns + "Control_Rods/Standard/Control_Rod.png"),
		"moderated_control": load(columns + "Control_Rods/Moderated/Control_Rod_Moderated.png"),
		"auto_control": load(columns + "Control_Rods/Automatic/Control_Rod_Automatic.png"),
		"steam": load(columns + "Steam_Column.png"),
		"graphite": load(columns + "Moderator_Column.png"),
		"reflector": load(columns + "Reflector_Column.png"),
		"absorber": load(columns + "Absorber_Column.png"),
		"irradiation": load(columns + "Irradiation_Column.png"),
		"heater": load(columns + "Heat_Exchanger_Column.png"),
		"cooler": load(base + "rbmk_cooler_top.png"),
		"structural": load(base + "rbmk_blank_top.png"),
	}
	control_texture_by_group = {
		"control_red": load(columns + "Control_Rods/Standard/Control_Rod_Red.png"),
		"control_yellow": load(columns + "Control_Rods/Standard/Control_Rod_Yellow.png"),
		"control_green": load(columns + "Control_Rods/Standard/Control_Rod_Green.png"),
		"control_blue": load(columns + "Control_Rods/Standard/Control_Rod_Blue.png"),
		"control_purple": load(columns + "Control_Rods/Standard/Control_Rod_Purple.png"),
		"moderated_control_red": load(columns + "Control_Rods/Moderated/Control_Rod_Moderated_Red.png"),
		"moderated_control_yellow": load(columns + "Control_Rods/Moderated/Control_Rod_Moderated_Yellow.png"),
		"moderated_control_green": load(columns + "Control_Rods/Moderated/Control_Rod_Moderated_Green.png"),
		"moderated_control_blue": load(columns + "Control_Rods/Moderated/Control_Rod_Moderated_Blue.png"),
		"moderated_control_purple": load(columns + "Control_Rods/Moderated/Control_Rod_Moderated_Purple.png"),
	}
	var fuel_files := {
		"ueu": "HEU233_HEU235_MEU_UEU.png", "meu": "HEU233_HEU235_MEU_UEU.png", "heu233": "HEU233_HEU235_MEU_UEU.png", "heu235": "HEU233_HEU235_MEU_UEU.png",
		"uzh": "UZH.png", "thmeu": "ThMEU.png", "lep": "HEP_HEP241_LEP_MEP.png", "mep": "HEP_HEP241_LEP_MEP.png", "hep239": "HEP_HEP241_LEP_MEP.png", "hep241": "HEP_HEP241_LEP_MEP.png",
		"lea": "LEA.png", "mea": "HEA241_HEA242_MEA.png", "hea241": "HEA241_HEA242_MEA.png", "hea242": "HEA241_HEA242_MEA.png", "men": "MEN.png", "hen": "HEN.png", "mox": "MOX.png",
		"les": "LES.png", "mes": "MES.png", "hes": "HES.png", "leaus": "HEAus_LEAus.png", "heaus": "HEAus_LEAus.png", "po210be": "Po210Be.png", "ra226be": "Ra226Be.png", "pu238be": "Pu238Be.png",
		"balefire_gold": "Flashgold.png", "flashlead": "Flashlead.png", "balefire": "Balefire.png", "zfb_bismuth": "ZFB_Bi.png", "zfb_pu241": "ZFB_Pu241.png", "zfb_am_mix": "ZFB_Am.png", "drx": "Digamma.png",
	}
	for id in fuel_files:
		fuel_texture_by_id[id] = load(columns + "Fuel_Rods/" + fuel_files[id])

func build_ui() -> void:
	var backdrop := TextureRect.new()
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.texture = console_region(Rect2(84, 4, 168, 164))
	backdrop.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.stretch_mode = TextureRect.STRETCH_TILE
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	backdrop.modulate = Color(0.42, 0.48, 0.48, 1.0)
	add_child(backdrop)

	var root := VBoxContainer.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 12
	root.offset_top = 12
	root.offset_right = -12
	root.offset_bottom = -12
	root.add_theme_constant_override("separation", 8)
	root.theme = console_theme()
	add_child(root)

	var top_panel := console_panel()
	top_panel.custom_minimum_size = Vector2(0, 54)
	root.add_child(top_panel)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 12)
	top_panel.add_child(top)
	var title := Label.new()
	title.text = "☢  RBMK DESIGNER"
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color("78d66b"))
	top.add_child(title)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)
	mode_label = Label.new()
	mode_label.text = "EDIT MODE"
	top.add_child(mode_label)
	var mode_buttons := HBoxContainer.new()
	var mode_group := ButtonGroup.new()
	var place_button := Button.new()
	place_button.text = "PLACE"
	place_button.toggle_mode = true
	place_button.button_group = mode_group
	place_button.button_pressed = true
	place_button.tooltip_text = "Place the selected column with a left click"
	place_button.pressed.connect(func(): set_edit_mode("place"))
	mode_buttons.add_child(place_button)
	var delete_button := Button.new()
	delete_button.text = "DELETE"
	delete_button.toggle_mode = true
	delete_button.button_group = mode_group
	delete_button.tooltip_text = "Remove columns with a left click"
	delete_button.pressed.connect(func(): set_edit_mode("delete"))
	mode_buttons.add_child(delete_button)
	top.add_child(mode_buttons)
	run_button = Button.new()
	run_button.text = "RUN"
	run_button.pressed.connect(toggle_run)
	top.add_child(run_button)
	var reset_button := Button.new()
	reset_button.text = "RESET"
	reset_button.pressed.connect(reset_simulation)
	top.add_child(reset_button)

	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 8)
	root.add_child(body)

	var left_panel := console_panel()
	left_panel.custom_minimum_size = Vector2(270, 0)
	body.add_child(left_panel)
	var left := VBoxContainer.new()
	left.add_theme_constant_override("separation", 8)
	left_panel.add_child(left)
	left.add_child(section_label("CHANNEL PALETTE"))

	palette_select = OptionButton.new()
	for i in CHANNELS.size():
		palette_select.add_item(CHANNELS[i].label, i)
	palette_select.item_selected.connect(func(index): selected_type = CHANNELS[index].id)
	left.add_child(label_wrap("COLUMN", palette_select))

	fuel_select = OptionButton.new()
	for i in fuels.size():
		fuel_select.add_item(fuels[i].name, i)
	fuel_select.item_selected.connect(func(index): selected_fuel = fuels[index].id)
	left.add_child(label_wrap("FUEL ROD", fuel_select))

	steam_select = OptionButton.new()
	for i in STEAM_TYPES.size():
		steam_select.add_item(STEAM_TYPES[i].label, i)
	steam_select.item_selected.connect(func(index): selected_steam = STEAM_TYPES[index].id)
	left.add_child(label_wrap("STEAM TYPE", steam_select))
	left.add_child(section_label("REACTOR STATUS"))

	tick_label = Label.new()
	flux_label = Label.new()
	heat_label = Label.new()
	steam_label = Label.new()
	for label in [tick_label, flux_label, heat_label, steam_label]:
		left.add_child(label)

	warnings_label = RichTextLabel.new()
	warnings_label.fit_content = true
	warnings_label.custom_minimum_size = Vector2(240, 120)
	left.add_child(warnings_label)

	var center := console_panel()
	center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(center)
	var grid_center := CenterContainer.new()
	center.add_child(grid_center)

	grid_container = GridContainer.new()
	grid_container.columns = GRID_SIZE
	grid_container.add_theme_constant_override("h_separation", 1)
	grid_container.add_theme_constant_override("v_separation", 1)
	grid_center.add_child(grid_container)

	var right_panel := console_panel()
	right_panel.custom_minimum_size = Vector2(300, 0)
	body.add_child(right_panel)
	var right := VBoxContainer.new()
	right_panel.add_child(right)
	right.add_child(section_label("DODD DIAGNOSTIC"))
	inspector_label = RichTextLabel.new()
	inspector_label.custom_minimum_size = Vector2(280, 0)
	inspector_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
	right.add_child(inspector_label)

	build_context_menu()

func section_label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 14)
	label.add_theme_color_override("font_color", Color("72d66a"))
	return label

func console_panel() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", console_box(Color("0b1110"), Color("466e48")))
	return panel

func console_box(background: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	return style

func console_theme() -> Theme:
	var theme := Theme.new()
	theme.set_default_font_size(14)
	theme.set_color("font_color", "Label", Color("d6dfd6"))
	theme.set_color("default_color", "RichTextLabel", Color("cbd6cb"))
	theme.set_stylebox("normal", "Button", console_box(Color("121b19"), Color("4e7552")))
	theme.set_stylebox("hover", "Button", console_box(Color("1c3021"), Color("81c774")))
	theme.set_stylebox("pressed", "Button", console_box(Color("0a3521"), Color("99ed79")))
	theme.set_stylebox("normal", "OptionButton", console_box(Color("111918"), Color("4e7552")))
	theme.set_stylebox("normal", "LineEdit", console_box(Color("090f0e"), Color("4e7552")))
	theme.set_color("font_color", "Button", Color("b8e890"))
	theme.set_color("font_color", "OptionButton", Color("d9e7ce"))
	return theme

func console_region(region: Rect2) -> AtlasTexture:
	var atlas := AtlasTexture.new()
	atlas.atlas = console_texture
	atlas.region = region
	return atlas

func build_context_menu() -> void:
	context_menu = PopupPanel.new()
	context_menu.size = Vector2i(260, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = Color("171d1f")
	style.border_color = Color("6f8588")
	style.set_border_width_all(2)
	style.set_corner_radius_all(2)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	context_menu.add_theme_stylebox_override("panel", style)
	add_child(context_menu)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	context_menu.add_child(box)
	context_title = Label.new()
	context_title.add_theme_font_size_override("font_size", 16)
	box.add_child(context_title)
	var hint := Label.new()
	hint.text = "Column settings"
	hint.modulate = Color("a9c4c5")
	box.add_child(hint)
	control_options = VBoxContainer.new()
	var insertion_row := HBoxContainer.new()
	var insertion_caption := Label.new()
	insertion_caption.text = "Insertion"
	insertion_caption.custom_minimum_size = Vector2(70, 0)
	insertion_row.add_child(insertion_caption)
	insertion_slider = HSlider.new()
	insertion_slider.min_value = 0.0
	insertion_slider.max_value = 100.0
	insertion_slider.step = 1.0
	insertion_slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	insertion_slider.value_changed.connect(_on_insertion_changed)
	insertion_row.add_child(insertion_slider)
	insertion_value = Label.new()
	insertion_value.custom_minimum_size = Vector2(42, 0)
	insertion_row.add_child(insertion_value)
	control_options.add_child(insertion_row)
	var group_row := HBoxContainer.new()
	var group_caption := Label.new()
	group_caption.text = "Group"
	group_caption.custom_minimum_size = Vector2(70, 0)
	group_row.add_child(group_caption)
	group_input = LineEdit.new()
	group_input.placeholder_text = "Default"
	group_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	group_input.text_submitted.connect(func(_text): apply_context_settings())
	group_row.add_child(group_input)
	control_options.add_child(group_row)
	box.add_child(control_options)
	var apply_button := Button.new()
	apply_button.text = "Apply settings"
	apply_button.pressed.connect(apply_context_settings)
	box.add_child(apply_button)
	var remove_button := Button.new()
	remove_button.text = "Delete column"
	remove_button.pressed.connect(delete_context_cell)
	box.add_child(remove_button)

func label_wrap(text: String, control: Control) -> VBoxContainer:
	var box := VBoxContainer.new()
	var label := Label.new()
	label.text = text
	box.add_child(label)
	box.add_child(control)
	return box

func render_grid() -> void:
	for child in grid_container.get_children():
		child.queue_free()
	cell_buttons.clear()
	for r in design.size:
		var row := []
		for c in design.size:
			var button := TextureButton.new()
			button.custom_minimum_size = Vector2(CELL_SIZE, CELL_SIZE)
			button.ignore_texture_size = true
			button.stretch_mode = TextureButton.STRETCH_KEEP_ASPECT_CENTERED
			button.gui_input.connect(_on_cell_input.bind(r, c))
			grid_container.add_child(button)
			row.append(button)
		cell_buttons.append(row)
	update_grid_runtime()

func _on_cell_input(event: InputEvent, row: int, col: int) -> void:
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			open_context_menu(row, col, get_viewport().get_mouse_position())
			accept_event()
		elif event.button_index == MOUSE_BUTTON_LEFT:
			if edit_mode == "delete":
				delete_cell(row, col)
			else:
				paint_cell(row, col)

func set_edit_mode(mode: String) -> void:
	edit_mode = mode
	mode_label.text = "Edit mode: %s" % ("Place" if mode == "place" else "Delete")

func open_context_menu(row: int, col: int, position: Vector2) -> void:
	selected_cell = Vector2i(col, row)
	var cell: Dictionary = design.cells[row][col]
	context_title.text = "Column %d, %d — %s" % [col + 1, row + 1, column_label(cell.type)]
	var is_control := ["control", "moderated_control", "auto_control"].has(cell.type)
	control_options.visible = is_control
	if is_control:
		insertion_slider.set_value_no_signal(cell.control_insertion)
		insertion_value.text = "%d%%" % roundi(cell.control_insertion)
		group_input.text = cell.control_group
	context_menu.position = Vector2i(position)
	context_menu.popup()
	update_all()

func column_label(id: String) -> String:
	for channel in CHANNELS:
		if channel.id == id:
			return channel.label
	return "Empty" if id == "empty" else id.capitalize()

func _on_insertion_changed(value: float) -> void:
	insertion_value.text = "%d%%" % roundi(value)
	var cell: Dictionary = design.cells[selected_cell.y][selected_cell.x]
	if ["control", "moderated_control", "auto_control"].has(cell.type):
		cell.control_insertion = value
		update_grid_runtime()
		update_all()

func apply_context_settings() -> void:
	var cell: Dictionary = design.cells[selected_cell.y][selected_cell.x]
	if ["control", "moderated_control", "auto_control"].has(cell.type):
		cell.control_insertion = insertion_slider.value
		cell.control_group = group_input.text.strip_edges() if not group_input.text.strip_edges().is_empty() else "Default"
	context_menu.hide()
	update_grid_runtime()
	update_all()

func delete_context_cell() -> void:
	delete_cell(selected_cell.y, selected_cell.x)
	context_menu.hide()

func delete_cell(row: int, col: int) -> void:
	selected_cell = Vector2i(col, row)
	design.cells[row][col] = create_cell()
	update_grid_runtime()
	update_all()

func update_grid_runtime() -> void:
	for r in design.size:
		for c in design.size:
			var cell = design.cells[r][c]
			var button: TextureButton = cell_buttons[r][c]
			button.texture_normal = column_texture(cell)
			var heat: float = sim.heat[r][c]
			var flux: float = sim.flux[r][c]
			var heat_glow: float = clamp((heat - 80.0) / 1300.0, 0.0, 1.0)
			var flux_glow: float = clamp(flux / 80.0, 0.0, 1.0)
			button.modulate = Color(1.0 + heat_glow * 0.55, 1.0 - heat_glow * 0.25, 1.0 - heat_glow * 0.35, 1.0)
			if flux_glow > 0.0:
				button.self_modulate = Color(1.0 - flux_glow * 0.25, 1.0, 1.0, 1.0)
			else:
				button.self_modulate = Color.WHITE

func column_texture(cell: Dictionary) -> Texture2D:
	if is_fuel(cell) and fuel_texture_by_id.has(cell.fuel_id):
		return fuel_texture_by_id[cell.fuel_id]
	if ["control", "moderated_control"].has(cell.type):
		var group_key: String = str(cell.type) + "_" + str(cell.control_group).to_lower()
		if control_texture_by_group.has(group_key):
			return control_texture_by_group[group_key]
	return texture_by_type.get(cell.type)

func paint_cell(row: int, col: int) -> void:
	selected_cell = Vector2i(col, row)
	design.cells[row][col] = make_paint_cell(selected_type)
	update_grid_runtime()
	update_all()

func make_paint_cell(type: String) -> Dictionary:
	return {
		"type": type,
		"fuel_id": selected_fuel if type == "fuel" or type == "moderated_fuel" else null,
		"steam_type": selected_steam if type == "steam" else "steam",
		"control_group": "Default",
		"control_insertion": 100.0 if type == "control" or type == "moderated_control" or type == "auto_control" else 0.0,
		"covered": true,
	}

func create_cell() -> Dictionary:
	return {"type": "empty", "fuel_id": null, "steam_type": "steam", "control_group": "Default", "control_insertion": 0.0, "covered": true}

func create_design(size: int) -> Dictionary:
	var cells := []
	for r in size:
		var row := []
		for c in size:
			row.append(create_cell())
		cells.append(row)
	return {"version": 1, "name": "Untitled RBMK", "size": size, "cells": cells}

func create_simulation_state(size: int) -> Dictionary:
	return {"tick": 0, "flux": make_matrix(size, 0.0), "heat": make_matrix(size, 20.0), "core_heat": make_matrix(size, 20.0), "skin_heat": make_matrix(size, 20.0), "xenon": make_matrix(size, 0.0), "depletion": make_matrix(size, 0.0), "meltdown": false}

func make_matrix(size: int, fill: float) -> Array:
	var matrix := []
	for r in size:
		var row := []
		for c in size:
			row.append(fill)
		matrix.append(row)
	return matrix

func copy_matrix(source: Array) -> Array:
	var matrix := []
	for row in source:
		matrix.append(row.duplicate())
	return matrix

func is_fuel(cell: Dictionary) -> bool:
	return (cell.type == "fuel" or cell.type == "moderated_fuel") and cell.fuel_id != null

func is_moderator(cell: Dictionary) -> bool:
	return cell.type == "graphite" or cell.type == "moderated_control" or cell.type == "moderated_fuel"

func split_efficiency(input_speed: String, target_speed: String) -> float:
	if input_speed == "any" or target_speed == "any" or input_speed == target_speed:
		return 1.0
	return 0.5 if target_speed == "slow" else 0.3

func control_transmission(cell: Dictionary) -> float:
	if not ["control", "moderated_control", "auto_control"].has(cell.type):
		return 1.0
	return clamp(1.0 - cell.control_insertion / 100.0, 0.0, 1.0)

func evaluate_decay(kind: String, depletion_percent: float) -> float:
	var enrichment = clamp(1.0 - depletion_percent / 100.0, 0.0, 1.0)
	match kind:
		"boosted_slope":
			return enrichment + sin((enrichment - 1.0) * (enrichment - 1.0) * PI)
		"raising_slope":
			return enrichment + sin(enrichment * PI) / 2.0
		"gentle_slope":
			return enrichment + sin(enrichment * PI) / 3.0
		"linear":
			return enrichment
		_:
			return enrichment

func evaluate_flux(kind: String, input: float, reactivity: float, self_rate: float) -> float:
	var x = max(0.0, input)
	match kind:
		"passive":
			return self_rate * reactivity
		"log_ten":
			return log(x + 1.0) / log(10.0) * 0.5 * reactivity
		"plateau":
			return (1.0 - exp(-x / 25.0)) * reactivity
		"negative_quadratic":
			return max(((x - (x * x) / 10000.0) / 100.0) * reactivity, 0.0)
		"sigmoid":
			return reactivity / (1.0 + exp(-(x - 50.0) / 10.0))
		"square_root":
			return sqrt(x) * reactivity / 10.0
		"linear":
			return (x / 100.0) * reactivity
		"quadratic":
			return ((x * x) / 10000.0) * reactivity
		_:
			return 0.0

func evaluate_fuel_output(fuel: Dictionary, incoming_flux: float, xenon_percent: float, depletion_percent: float, core_heat: float) -> float:
	var adjusted_input = max(0.0, incoming_flux + fuel.self_rate)
	var xenon_adjusted = adjusted_input * max(0.0, 1.0 - xenon_percent / 100.0)
	var depletion_reactivity = evaluate_decay(fuel.decay, depletion_percent)
	var heat_coeff = 1.0
	if fuel.heat_coeff_start > 0.0 and core_heat >= fuel.heat_coeff_start:
		var progress = min(1.0, (core_heat - fuel.heat_coeff_start) / fuel.heat_coeff_length)
		heat_coeff = sin((progress * PI + PI) / 2.0)
	return evaluate_flux(fuel.flux_function, xenon_adjusted, fuel.reactivity * depletion_reactivity * heat_coeff, fuel.self_rate)

func fuel_output(cell: Dictionary, incoming_flux: float, xenon: float, depletion: float, core_heat: float) -> float:
	if cell.fuel_id == null or not fuel_by_id.has(cell.fuel_id):
		return 0.0
	return evaluate_fuel_output(fuel_by_id[cell.fuel_id], incoming_flux, xenon, depletion, core_heat)

func step_simulation(current_design: Dictionary, previous: Dictionary) -> Dictionary:
	var size: int = current_design.size
	var flux = make_matrix(size, 0.0)
	var heat = copy_matrix(previous.heat)
	var core_heat = copy_matrix(previous.core_heat)
	var skin_heat = copy_matrix(previous.skin_heat)
	var xenon = copy_matrix(previous.xenon)
	var depletion = copy_matrix(previous.depletion)

	for pass_index in 4:
		for r in size:
			for c in size:
				var cell = current_design.cells[r][c]
				if not is_fuel(cell):
					continue
				var fuel = fuel_by_id.get(cell.fuel_id)
				var source_output = fuel_output(cell, flux[r][c], xenon[r][c], depletion[r][c], core_heat[r][c]) / 4.0
				if source_output <= 0.0:
					continue
				for dir in DIRS:
					var nr = r + dir.y
					var nc = c + dir.x
					var stream = source_output
					var speed = "slow" if cell.type == "moderated_fuel" else fuel.splits_into
					while nr >= 0 and nr < size and nc >= 0 and nc < size and stream > 0.001:
						var target = current_design.cells[nr][nc]
						if is_moderator(target):
							speed = "slow"
						if target.type == "empty":
							break
						if ["control", "moderated_control", "auto_control"].has(target.type):
							var transmission = control_transmission(target)
							heat[nr][nc] += stream * (1.0 - transmission) / 20.0
							stream *= transmission
							if stream <= 0.001:
								break
						if target.type == "absorber" or target.type == "irradiation":
							heat[nr][nc] += stream / 20.0
							break
						if target.type == "reflector":
							flux[r][c] += stream * 0.8
							break
						if is_fuel(target):
							var target_fuel = fuel_by_id.get(target.fuel_id)
							if target_fuel:
								flux[nr][nc] += stream * split_efficiency(speed, target_fuel.splits_with)
							break
						nr += dir.y
						nc += dir.x

	var meltdown = previous.meltdown
	for r in size:
		for c in size:
			var cell = current_design.cells[r][c]
			if is_fuel(cell):
				var fuel = fuel_by_id.get(cell.fuel_id)
				var out = fuel_output(cell, flux[r][c], xenon[r][c], depletion[r][c], core_heat[r][c])
				core_heat[r][c] += out * fuel.heat_per_flux
				var core_to_skin = ((core_heat[r][c] - skin_heat[r][c]) / 2.0) * fuel.diffusion
				core_heat[r][c] -= core_to_skin
				skin_heat[r][c] += core_to_skin
				var skin_to_column = (skin_heat[r][c] - heat[r][c]) / 2.0
				skin_heat[r][c] -= skin_to_column
				heat[r][c] += skin_to_column
				var input_with_source = max(0.0, flux[r][c] + fuel.self_rate)
				var xenon_after_burn = max(0.0, xenon[r][c] - (input_with_source * input_with_source) / fuel.xenon_burn_divisor)
				var xenon_adjusted_input = input_with_source * max(0.0, 1.0 - xenon_after_burn / 100.0)
				xenon[r][c] = clamp(xenon_after_burn + xenon_adjusted_input * fuel.xenon_gen, 0.0, 100.0)
				depletion[r][c] = min(100.0, depletion[r][c] + (xenon_adjusted_input / fuel.yield) * 100.0)
				if skin_heat[r][c] >= fuel.melting_point:
					var spike = (skin_heat[r][c] + core_heat[r][c]) / 3.0
					heat[r][c] += spike
					skin_heat[r][c] += spike
					core_heat[r][c] += spike

			var steam = steam_by_id(cell.steam_type)
			if cell.type == "steam" and steam and heat[r][c] >= steam.min_temp:
				heat[r][c] = max(20.0, heat[r][c] - steam.min_temp * 0.15)
			if cell.type == "heater":
				heat[r][c] = max(20.0, heat[r][c] - 30.0)
			if cell.type == "cooler":
				heat[r][c] = max(20.0, heat[r][c] - 80.0)

	var diffused = copy_matrix(heat)
	for r in size:
		for c in size:
			for dir in DIRS:
				var nr = r + dir.y
				var nc = c + dir.x
				if nr < 0 or nr >= size or nc < 0 or nc >= size:
					diffused[r][c] = max(20.0, diffused[r][c] - 0.4)
					continue
				var delta = (heat[r][c] - heat[nr][nc]) * 0.025
				diffused[r][c] -= delta
				diffused[nr][nc] += delta
			diffused[r][c] = max(20.0, diffused[r][c] * 0.997)
			if diffused[r][c] >= MELTDOWN_TEMP:
				meltdown = true

	return {"tick": previous.tick + 1, "flux": flux, "heat": diffused, "core_heat": core_heat, "skin_heat": skin_heat, "xenon": xenon, "depletion": depletion, "meltdown": meltdown}

func steam_by_id(id: String) -> Variant:
	for steam in STEAM_TYPES:
		if steam.id == id:
			return steam
	return null

func summarize() -> Dictionary:
	var max_heat := 20.0
	var total_flux := 0.0
	var total_heat := 0.0
	var steam_total := 0
	var has_fuel := false
	var has_igniter := false
	var warnings := []
	for r in design.size:
		for c in design.size:
			var cell = design.cells[r][c]
			max_heat = max(max_heat, sim.heat[r][c])
			total_flux += sim.flux[r][c]
			if is_fuel(cell):
				has_fuel = true
				var fuel = fuel_by_id.get(cell.fuel_id)
				has_igniter = has_igniter or fuel.self_igniting
				total_heat += fuel_output(cell, sim.flux[r][c], sim.xenon[r][c], sim.depletion[r][c], sim.core_heat[r][c]) * fuel.heat_per_flux
			var steam = steam_by_id(cell.steam_type)
			if cell.type == "steam" and steam and sim.heat[r][c] >= steam.min_temp:
				steam_total += steam.mb_per_tick
	if has_fuel and not has_igniter:
		warnings.append("No self-igniting/source fuel is present.")
	if max_heat >= MELTDOWN_TEMP * 0.9:
		warnings.append("Meltdown risk: max column heat is %d C." % roundi(max_heat))
	if sim.meltdown:
		warnings.append("Simulation has crossed meltdown conditions.")
	return {"max_heat": max_heat, "total_flux": total_flux, "total_heat": total_heat, "steam_total": steam_total, "warnings": warnings}

func update_all() -> void:
	var summary = summarize()
	tick_label.text = "Tick: %d" % sim.tick
	flux_label.text = "Flux: %.2f" % summary.total_flux
	heat_label.text = "Heat: %.2f/t | Max %.0f C" % [summary.total_heat, summary.max_heat]
	steam_label.text = "Steam: %d mB/t" % summary.steam_total
	warnings_label.text = "[b]Warnings[/b]\n" + ("\n".join(summary.warnings) if summary.warnings.size() else "None")
	update_inspector()

func update_inspector() -> void:
	var row = selected_cell.y
	var col = selected_cell.x
	var cell = design.cells[row][col]
	var text := "[b]Column %d,%d[/b]\nType: %s\nHeat: %.1f C\nFlux: %.2f\nCore: %.1f C\nSkin: %.1f C\nXenon: %.2f%%\nDepletion: %.4f%%\n" % [col + 1, row + 1, cell.type, sim.heat[row][col], sim.flux[row][col], sim.core_heat[row][col], sim.skin_heat[row][col], sim.xenon[row][col], sim.depletion[row][col]]
	if is_fuel(cell):
		var fuel = fuel_by_id[cell.fuel_id]
		text += "\n[b]%s[/b]\nYield: %.0f\nFunction: %s\nReactivity: %.1f\nSelf flux: %.1f\nHeat/flux: %.2f\nMelt: %.0f C" % [fuel.name, fuel.yield, fuel.flux_function, fuel.reactivity, fuel.self_rate, fuel.heat_per_flux, fuel.melting_point]
	inspector_label.text = text

func toggle_run() -> void:
	running = not running
	run_button.text = "Pause" if running else "Run"

func reset_simulation() -> void:
	sim = create_simulation_state(design.size)
	sim_accumulator = 0.0
	update_grid_runtime()
	update_all()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		get_tree().quit()
