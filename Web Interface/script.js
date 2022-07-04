let unit = 0;
let app;

let car_input_x, car_input_y;
let person_input_x, person_input_y;
let top_input_x, top_input_y, bottom_input_x, bottom_input_y;

let ranges = { x: [1, 100], y: [1, 16] };

window.addEventListener('load', () => {

    let car_inputs = document.body.querySelectorAll('.pane.car .input'); // from the html, calls the inputs in this class "pane car" and the order in array is order in html
    car_input_x = car_inputs[0];
    car_input_y = car_inputs[1];

    let person_inputs = document.body.querySelectorAll('.pane.person .input');
    person_input_x = person_inputs[0];
    person_input_y = person_inputs[1];

    let handle_inputs = document.body.querySelectorAll('.pane.block .input');
    top_input_x = handle_inputs[0];
    top_input_y = handle_inputs[1];
    bottom_input_x = handle_inputs[2];
    bottom_input_y = handle_inputs[3];

    let canvas = document.querySelector('.scene'); // from the html
    canvas.addEventListener('click', forceBlur);
    app = new PIXI.Application({ width: canvas.clientWidth, height: canvas.clientHeight, view: canvas, resolution: 2 });
    unit = canvas.clientWidth / 100;

    let background = PIXI.Sprite.from('scene.png');
    background.name = "background";
    background.width = app.screen.width;
    background.height = app.screen.height;

    let person = PIXI.Sprite.from("person.png");
    person.name = "person";
    person.interactive = true;
    person.buttonMode = true; // changes button when you pan over person
    person.width = unit; // person is 1 unit tall/wide
    person.height = unit;
    person.anchor.set(0.5); // PIXI, makes cetner of sprite (person) instead of corner

    person // events: registering events on the perso, what the user can dow itht their cursor
        .on('pointerdown', onDragStart) // on click, user starts to drag the person
        .on('pointerup', onDragEnd) // user stops clicking/dragging
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', personDragMove); // moves the person with clicked cursor

    let car = PIXI.Sprite.from('car.png');
    car.name = "car";
    car.interactive = true;
    car.buttonMode = true;
    car.width = unit * 3.4;
    car.height = unit * 2;
    car.anchor.set(0.0, 1.0);

    car
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', carDragMove);

    let bottom_corner = PIXI.Sprite.from('handle.png');
    bottom_corner.name = "bottom_corner";
    bottom_corner.interactive = true;
    bottom_corner.buttonMode = true;
    bottom_corner.width = 2 * unit;
    bottom_corner.height = 2 * unit;
    bottom_corner.anchor.set(0.5);

    bottom_corner
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', handleDragMove);

    let top_corner = PIXI.Sprite.from('handle.png');
    top_corner.name = "top_corner";
    top_corner.interactive = true;
    top_corner.buttonMode = true;
    top_corner.width = 2 * unit;
    top_corner.height = 2 * unit;
    top_corner.anchor.set(0.5);

    top_corner
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', handleDragMove);

    let block = new PIXI.Graphics();
    block.beginFill(0x03adfc, .5);
    block.lineStyle(0, 0xFF0000);
    block.drawRect(0, 0, 300, 200);
    block.name = "block";

    app.stage.addChild(background); // add all the sprites to the canvas
    app.stage.addChild(person);
    app.stage.addChild(car);
    app.stage.addChild(block);
    app.stage.addChild(bottom_corner);
    app.stage.addChild(top_corner);

    setupInputs();
    adjustBlock();

    let generateBtn = document.querySelector('.generate .big_button');
    generateBtn.addEventListener('click', () => {
        let generatePane = document.querySelector('.generate');
        let loadingPane = document.querySelector('.loading');
        generatePane.style.display = "none";
        loadingPane.style.display = "flex";

        let randBtns = document.querySelectorAll('.random');
        randBtns.forEach((rand) => rand.classList.add("hidden"));

        

        document.querySelectorAll('.controls .input').forEach((inp) => {
            inp.setAttribute("contenteditable", "false");
            inp.classList.remove("editable");
        });

        app.stage.children.forEach((child) => {
            child.interactive = false;
            if (child.name.search("corner") > -1) child.visible = false;
        });

        let bar = loadingPane.querySelector('.bar'); // bar inside of progress bar
        bar.style.width = "0px";
        setTimeout(() => bar.style.width = "calc(100% - 8px)", 50); // () => "anonymous function, function wihtout a name"
    });

    document.querySelectorAll('.pane').forEach((pane) => {
        let randBtn = pane.querySelector('.button.random');
        if (!randBtn) return;
        let inputs = pane.querySelectorAll('.input');
        randBtn.addEventListener('click', () => {
            inputs.forEach((inp) => {
                let prop = inp.dataset.prop; // x or y of each pane:car/person
                let range = ranges[prop];
                if (!range) range = [0, 100];
                let diff = range[1] - range[0];
                inp.innerHTML = range[0] + Math.floor(Math.random() * diff);
                performChanges(inp);
            });
        });
    });
});

function clamp(n, lower, upper) { // keeps person on the screen so their x and y values can't go off screen
    return Math.min(Math.max(lower, n), upper);
}

function forceBlur() { // to be able to click away from textbox
    let temp = document.createElement("input");
    document.body.appendChild(temp);
    temp.focus();
    document.body.removeChild(temp);
}

function isDigit(char) {
    return char.length == 1 && (char >= '0' && char <= '9');
}

function adjustBlock() {
    let top = app.stage.getChildByName("top_corner");
    let bottom = app.stage.getChildByName("bottom_corner");
    let block = app.stage.getChildByName("block")
    block.x = top.x;
    block.y = top.y;
    let diff_x = bottom.x - top.x;
    let diff_y = bottom.y - top.y;
    block.width = diff_x;
    block.height = diff_y;
}

function performChanges(inp) {  // applying the user input number to car/ped x and y, detection happened below:
    let obj = app.stage.getChildByName(inp.dataset.obj); // car or person
    let value = parseInt(inp.innerHTML) * unit;
    obj[inp.dataset.prop] = isNaN(value) ? unit : value; // obj = car @ inp.ds.prop = car_x or car_y set to value
}

function setupInputs() { // setup input events, makes sure user can only type in numbers, and what to do if they dont' type anything, set up scene after user makes change
    let inputs = document.querySelectorAll('.pane .input');
    inputs.forEach((inp) => {
        performChanges(inp); // default starting positions
        inp.addEventListener('keydown', (e) => {
            if (e.key == "Backspace" || isDigit(e.key)) { // allows input

            } else if (e.key == "Enter") {
                forceBlur();
                e.preventDefault(); // the event won't do anything
            } else if (e.key.search("Arrow") == -1) { // prevetns output if it's not an arrow key
                e.preventDefault();
            }
        });
        inp.addEventListener('keyup', (e) => {
            performChanges(inp); // applying new changes
        });
        inp.addEventListener('focusout', (e) => { // if user clicks away from the input, empty textbox is set to one
            if (isNaN(parseInt(inp.innerText))) inp.innerHTML = "1";
            performChanges(inp);
        });
    });
}

// runs once at begining
function onDragStart(event) { // saving a reference to the event (x,y of car being dragged gets saved back into the sprite/pane)
    this.dragging = true;
    this.data = event.data; //binds the events to that object, the car or the person -- helps for separating moves between car and person for touch screen/moving both object at once
}

// runs once at end
function onDragEnd() {
    this.dragging = false;
}

// runs multiple times, continually updates position with cursor
function carDragMove() {
    if (this.dragging) {
        const newPosition = this.data.getLocalPosition(this.parent);
        let new_x = newPosition.x - (this.width / 2);
        let new_y = newPosition.y + (this.height / 2);
        let grid_x = clamp(Math.round(new_x / unit), 0, 100);
        let grid_y = clamp(Math.round(new_y / unit), 1, 15);
        this.x = grid_x * unit;
        this.y = grid_y * unit;
        car_input_x.innerHTML = grid_x;
        car_input_y.innerHTML = grid_y;
    }
}

function personDragMove() {
    if (this.dragging) {
        const newPosition = this.data.getLocalPosition(this.parent);
        let grid_x = clamp(Math.round(newPosition.x / unit), 0, 100);
        let grid_y = clamp(Math.round(newPosition.y / unit), 0, 15);
        this.x = grid_x * unit;
        this.y = grid_y * unit;
        person_input_x.innerHTML = grid_x;
        person_input_y.innerHTML = grid_y;
    }
}

function handleDragMove() {
    if (this.dragging) {
        const newPosition = this.data.getLocalPosition(this.parent);
        let grid_x = clamp(Math.round(newPosition.x / unit), 0, 100);
        let grid_y = clamp(Math.round(newPosition.y / unit), 0, 15);
        this.x = grid_x * unit;
        this.y = grid_y * unit;
        if(this.name == "top_corner") {
            top_input_x.innerHTML = grid_x;
            top_input_y.innerHTML = grid_y;
        } else {
            bottom_input_x.innerHTML = grid_x;
            bottom_input_y.innerHTML = grid_y;
        }
    }
    adjustBlock();
}