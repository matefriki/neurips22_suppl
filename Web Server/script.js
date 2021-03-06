// Global reference to PIXI app
let app, socket;
let unit = 0;

// References to text inputs
let car_input_x, car_input_y;
let person_input_x, person_input_y;
let top_input_x, top_input_y, bottom_input_x, bottom_input_y;

/* Dimensions of 100x15 world in units, for use in converting between coords
   This is necessary because the origin of the model's world is in the bottom left corner,
   while the origin of the pixi world is in the top left, requiring a vertical reflection of all coords */
let world_width = 100;
let world_height = 15;

window.addEventListener('load', () => {

    // Create socket connection with server
    socket = io();
    socket.on("path", animatePath);

    // Get references to the car's inputs from html
    let car_inputs = document.body.querySelectorAll('.pane.car .input');
    car_input_x = car_inputs[0];
    car_input_y = car_inputs[1];

    // Get references to the person's inputs from html
    let person_inputs = document.body.querySelectorAll('.pane.person .input');
    person_input_x = person_inputs[0];
    person_input_y = person_inputs[1];

    // Get references to the block's inputs from html
    let handle_inputs = document.body.querySelectorAll('.pane.block .input');
    top_input_x = handle_inputs[0];
    top_input_y = handle_inputs[1];
    bottom_input_x = handle_inputs[2];
    bottom_input_y = handle_inputs[3];

    // Find canvas to draw on from html and create PixiJS application
    let canvas = document.querySelector('.scene');
    canvas.addEventListener('click', forceBlur);
    // Make pixi scene the same size as canvas
    app = new PIXI.Application({ width: canvas.clientWidth, height: canvas.clientHeight, view: canvas, resolution: 2 });

    // Define unit as 1/100th of canvas (and scene) width, because world is 100x15 units
    unit = canvas.clientWidth / 100;

    // Create sprite for background (road scene)
    let background = PIXI.Sprite.from('scene.png');
    background.name = "background";
    background.width = app.screen.width;
    background.height = app.screen.height;

    // Create sprite for person
    let person = PIXI.Sprite.from("person.png");
    person.name = "person";
    person.interactive = true;
    person.buttonMode = true; // Changes cursor to button cursor when you hover over person
    person.width = unit; // Person is 1x1 units
    person.height = unit;
    person.anchor.set(0.5); // Set sprite's anchor to center so it will lie at grid intersections

    // Register dragging events for person
    person
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', personDragMove);

    // Create sprite for car
    let car = PIXI.Sprite.from('car.png');
    car.name = "car";
    car.interactive = true;
    car.buttonMode = true;
    car.width = unit * 3.4;
    car.height = unit * 2;
    car.anchor.set(0.0, 1.0);

    // Register dragging events for car
    car
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', carDragMove);

    // Create sprite for the bottom handle of the block
    let bottom_corner = PIXI.Sprite.from('handle.png');
    bottom_corner.name = "bottom_corner";
    bottom_corner.interactive = true;
    bottom_corner.buttonMode = true;
    bottom_corner.width = 2 * unit;
    bottom_corner.height = 2 * unit;
    bottom_corner.anchor.set(0.5);

    // Register dragging events for bottom handle
    bottom_corner
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', cornerDragMove);

    // Create sprite for the top handle of the block
    let top_corner = PIXI.Sprite.from('handle.png');
    top_corner.name = "top_corner";
    top_corner.interactive = true;
    top_corner.buttonMode = true;
    top_corner.width = 2 * unit;
    top_corner.height = 2 * unit;
    top_corner.anchor.set(0.5);

    // Register dragging events for top handle
    top_corner
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', cornerDragMove);

    // Create sprite for filled block itself
    let block = new PIXI.Graphics();
    block.beginFill(0x03adfc, .5);
    block.lineStyle(0, 0xFF0000);
    block.drawRect(0, 0, 300, 200);
    block.name = "block";

    // Add all sprites to the Pixi stage
    app.stage.addChild(background);
    app.stage.addChild(person);
    app.stage.addChild(car);
    app.stage.addChild(block);
    app.stage.addChild(bottom_corner);
    app.stage.addChild(top_corner);

    // Register events for all text inputs (sets up input restrictions)
    setupInputs();
    // Stretch filled rect between the two handles
    adjustBlock();

    // When generate button is pressed show progress bar and deactivate controls
    let generateBtn = document.querySelector('.generate .big_button');
    generateBtn.addEventListener('click', () => {
        // Hide the generate button/message, and show the loading pane
        let generatePane = document.querySelector('.generate');
        generatePane.style.display = "none";
        setLoadingVisibility(true);

        // Deactivate the UI controls
        setControlsActive(false);

        // Send starting state through socket
        sendGenerateMessage();

        // Play the progress bar loading animation
        setProgressScale(0.0);
        setTimeout(setProgressScale.bind(this, 0.5, 1), 50);
    });

    // Setup random buttons
    document.querySelectorAll('.pane').forEach((pane) => {
        let randBtn = pane.querySelector('.button.random');
        // If a pane doesn't have a random button then do nothing
        if (!randBtn) return;
        let inputs = pane.querySelectorAll('.input');
        // Register click events for the random buttons
        randBtn.addEventListener('click', () => {
            inputs.forEach((inp) => {
                let prop = inp.dataset.prop;
                // Parse the range for a given text input from the html
                range = getInputRange(inp);
                // If range is invalid for some reason then use default range
                if (!range) range = [0, 100];
                // Get the "range" of the range, and add 1 to make it inclusive
                let diff = range[1] - range[0] + 1;
                // Generate random number within range and set the text input's value to it
                inp.innerHTML = range[0] + Math.floor(Math.random() * diff);
                // Apply the random change to the scene
                performChanges(inp);
            });
        });
    });
});

// Keeps the value "n" within the inclusive range given by "lower" and "upper"
function clamp(n, lower, upper) {
    return Math.min(Math.max(lower, n), upper);
}

// Returns true if the given char is a digit from 0-9
function isDigit(char) {
    return char.length == 1 && (char >= '0' && char <= '9');
}

// Unfocus/deselect any active text inputs by momentarily creating, focusing, then destroying, a temporary input
function forceBlur() {
    let temp = document.createElement("input");
    document.body.appendChild(temp);
    temp.focus();
    document.body.removeChild(temp);
}

/* Parse the ranges (inclusive) found in the html that follow the format data-range="lower:upper"
   Returns an array of format [lower, upper] if the range is valid, otherwise null */
function parseRange(rangeStr) {
    if(!rangeStr) return null;
    let range = rangeStr.split(':').map((x) => parseInt(x));
    if(range.length != 2 || range.some((x) => isNaN(x))) return null;
    return range;
}

// Parse the desired range of a text input, using "parseRange(rangeStr)"
function getInputRange(inp) {
    return parseRange(inp.dataset.range);
}

/* Redraws the filled/translucent portion of the visibility block when the handles move
   The visibility block is made up of two "handles" and then a filled rectangle "block" that's stretched between them */
function adjustBlock() {
    // Get references to Pixi objects that make up the block
    let top = app.stage.getChildByName("top_corner");
    let bottom = app.stage.getChildByName("bottom_corner");
    let block = app.stage.getChildByName("block")
    // Resize and reposition the rectangle "block"
    block.x = top.x;
    block.y = top.y;
    let diff_x = bottom.x - top.x;
    let diff_y = bottom.y - top.y;
    block.width = diff_x;
    block.height = diff_y;
}

// Applies the value of the given text input to the Pixi scene
function performChanges(inp) {
    // Gets reference to associated Pixi object defined by the input's data attribute data-obj="pixi_object" (eg. "person", "car")
    let obj_name = inp.dataset.obj;
    if(!obj_name) return;
    let obj = app.stage.getChildByName(obj_name);
    // Attempt to parse the input's value as an integer
    let value = parseInt(inp.innerHTML) * unit;
    if(isNaN(value)) value = unit;
    // Pixi object property to change, defined by data-prop="object_property" (eg. "x", "y")
    let prop = inp.dataset.prop;
    // If changing y value then flip vertically
    if(prop == "y") value = (world_height * unit) - value;
    /* Assign the parsed or default value to the desired Pixi object property
       if parse was unsuccessful then use default of 1 unit */
    obj[prop] = value;
}

// Clamps the value in an input to its specified range (given by data-range)
function clampInput(inp) {
    let range = getInputRange(inp);
    inp.innerHTML = clamp(inp.innerText, range[0], range[1]);
}

// Setup the html text inputs by registering events, in order to restrict input
function setupInputs() {
    let inputs = document.querySelectorAll('.input');
    inputs.forEach((inp) => {
        // Apply default starting positions on page load
        performChanges(inp);
        // Register keydown event and restrict input
        inp.addEventListener('keydown', (e) => {
            if (e.key == "Enter") {
                // Deselect/unfocus text input
                forceBlur();
                // Clamp the input value to range
                clampInput(inp);
                // Disable typing of new line
                e.preventDefault();
            } else if (!isDigit(e.key) && e.key.search("Arrow") == -1 && e.key != "Backspace") { // Disable input of invalid chars (not 0-9)
                e.preventDefault();
            }
        });
        // Register keyup event to apply input changes to Pixi scene (must happen in keyup because only then input value has been updated/appended to by keypress)
        inp.addEventListener('keyup', (e) => {
            // Apply new changes
            performChanges(inp);
        });
        // Set textbox to default value on unfocus if blank, otherwise apply changes
        inp.addEventListener('focusout', (e) => { // If user clicks away from the input, empty textbox is set to one
            if (isNaN(parseInt(inp.innerText))) inp.innerHTML = "1";
            clampInput(inp);
            performChanges(inp);
        });
    });
}

// Sets the progress bar fullness to the desired scale (from 0-1), with the given animation duration (in seconds)
function setProgressScale(scale, seconds) {
    let loadingPane = document.querySelector('.loading');
    let bar = loadingPane.querySelector('.bar');
    bar.style.transition = `width ${seconds}s ease-out`;
    bar.style.width = `calc(${scale * 100}% - 8px)`;
}

// Makes the loading/progress bar pane either visible or fade away depending on the given boolean
function setLoadingVisibility(visible) {
    let loadingPane = document.querySelector('.loading');
    if(visible) {
        loadingPane.classList.remove("fully_hidden");
        loadingPane.style.display = "flex";
    }
    else loadingPane.classList.add("fully_hidden");
}

// Enable or disable both html controls and draggable object in Pixi scene, depending on whether "active" is true or false
function setControlsActive(active) {
    // Hide the randomize buttons with fade animation
    let randBtns = document.querySelectorAll('.random');
    randBtns.forEach((rand) => {
        if(active) rand.classList.remove("hidden");
        else rand.classList.add("hidden");
    });

    // Disable editing of text inputs, though they remain visible
    document.querySelectorAll('.controls .input').forEach((inp) => {
        inp.setAttribute("contenteditable", active ? "true" : "false");
        if(active) inp.classList.add("editable");
        else inp.classList.remove("editable");
    });

    // Disable dragging and hover effects of Pixi objects (eg. car and person)
    app.stage.children.forEach((child) => {
        child.interactive = active;
        if (child.name.search("corner") > -1) child.visible = active;
    });
}

// let car_input_x, car_input_y;
// let person_input_x, person_input_y;
// let top_input_x, top_input_y, bottom_input_x, bottom_input_y;
// path_length, person_x, person_y, car_x, car_y, top_corner_x, top_corner_y, bottom_corner_x, bottom_corner_y
function sendGenerateMessage() {
    let path_length = document.querySelector('.generate .input');
    console.log(path_length.innerText);
    socket.emit('generate', path_length.innerText, person_input_x.innerText, person_input_y.innerText, car_input_x.innerText, car_input_y.innerText, top_input_x.innerText, top_input_y.innerText, bottom_input_x.innerText, bottom_input_y.innerText);
}

// Handle beginning of drag event
function onDragStart(event) {
    this.dragging = true; // Tracks whether a Pixi object is currently being dragged 
    this.data = event.data; // Tracks which event applies to which Pixi object, helps for separating moves between car and person for touch screen/moving both object at once
}

// Handle end of drag event, and set object state to not dragging
function onDragEnd() {
    this.dragging = false;
}

// Handle car being dragged (runs whenever mouse moves)
function carDragMove() {
    if (this.dragging) {
        // Get current position of mouse cursor
        const newPosition = this.data.getLocalPosition(this.parent);
        // Center car on cursor (because anchor is in bottom left corner)
        let new_x = newPosition.x - (this.width / 2);
        let new_y = newPosition.y + (this.height / 2);
        // Find ranges for x and y
        let range_x = getInputRange(car_input_x);
        let range_y = getInputRange(car_input_y);
        // Round mouse position to fit on grid, and clamp within world boundaries
        let grid_x = clamp(Math.round(new_x / unit), range_x[0], range_x[1]);
        let grid_y = clamp(Math.round(new_y / unit), range_y[0], range_y[1]);
        // Resize grid coord by size of unit to get new position
        this.x = grid_x * unit;
        this.y = grid_y * unit;
        // Update text inputs with new position (reflected vertically)
        car_input_x.innerHTML = grid_x;
        car_input_y.innerHTML = world_height - grid_y;
    }
}

// Handle person being dragged (runs whenever mouse moves)
function personDragMove() {
    if (this.dragging) {
        // Get current position of mouse cursor
        const newPosition = this.data.getLocalPosition(this.parent);
        // Find ranges for x and y
        let range_x = getInputRange(person_input_x);
        let range_y = getInputRange(person_input_y);
        // Round mouse position to fit on grid, and clamp within world boundaries
        let grid_x = clamp(Math.round(newPosition.x / unit), range_x[0], range_x[1]);
        let grid_y = clamp(Math.round(newPosition.y / unit), range_y[0], range_y[1]);
        // Resize grid coord by size of unit to get new position
        this.x = grid_x * unit;
        this.y = grid_y * unit;
        // Update text inputs with new position (reflected vertically)
        person_input_x.innerHTML = grid_x;
        person_input_y.innerHTML = world_height - grid_y;
    }
}

// Handle both corners being dragged
function cornerDragMove() {
    if (this.dragging) {
        // Get current position of mouse cursor
        const newPosition = this.data.getLocalPosition(this.parent);
        // Update text inputs with new position, depending on which handle is moved (reflected vertically)
        let range_x, range_y;
        let isTopCorner = this.name == "top_corner";
        range_x = getInputRange(isTopCorner ? top_input_x : bottom_input_x);
        range_y = getInputRange(isTopCorner ? top_input_y : bottom_input_y);
        // Round mouse position to fit on grid, and clamp within world boundaries
        let grid_x = clamp(Math.round(newPosition.x / unit), range_x[0], range_x[1]);
        let grid_y = clamp(Math.round(newPosition.y / unit), range_y[0], range_y[1]);
        // Update the text inputs to reflect new position
        if(this.name == "top_corner") {
            top_input_x.innerHTML = grid_x;
            top_input_y.innerHTML = world_height - grid_y;
        } else {
            bottom_input_x.innerHTML = grid_x;
            bottom_input_y.innerHTML = world_height - grid_y;
        }
        // Resize grid coord by size of unit to get new position
        this.x = grid_x * unit;
        this.y = grid_y * unit;
    }
    // Rescale and position filled rect of block to reflect new handle positions
    adjustBlock();
}

// Display the generated path as an animation
function animatePath(path) {
    console.log(path);
    setProgressScale(1.0, .5);
    setTimeout(setLoadingVisibility.bind(this, false), 500);

    let person = app.stage.getChildByName("person");
    let car = app.stage.getChildByName("car");
    path = JSON.parse(path);
    let path_length = path["action"].length;
    let path_ind = 0;

    const ticker = new PIXI.Ticker();
    ticker.stop();
    let time = 0.0;
    ticker.add((delta) => {
        time += delta;
        if(time > 2) {
            path_ind = (path_ind + 1) % path_length;
            car.x = parseInt(path["car_x"][path_ind]) * unit;
            car.y = (world_height - parseInt(path["car_y"][path_ind])) * unit;
            person.x = parseInt(path["ped_x"][path_ind]) * unit;
            person.y = (world_height - parseInt(path["ped_y"][path_ind])) * unit;
            time = 0.0;
        }
    });
    ticker.start();
}