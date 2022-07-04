let unit = 0;
let app;

let car_input_x, car_input_y;
let person_input_x, person_input_y;

let ranges = {x: [1, 100], y: [1, 16]};

window.addEventListener('load', () => {

    let car_inputs = document.body.querySelectorAll('.pane.car .input');
    car_input_x = car_inputs[0];
    car_input_y = car_inputs[1];

    let person_inputs = document.body.querySelectorAll('.pane.person .input');
    person_input_x = person_inputs[0];
    person_input_y = person_inputs[1];

    let canvas = document.querySelector('.scene');
    canvas.addEventListener('click', forceBlur);
    app = new PIXI.Application({width: canvas.clientWidth, height: canvas.clientHeight, view: canvas, resolution: 2});
    unit = canvas.clientWidth / 100;

    let background = PIXI.Sprite.from('scene.png');
    background.name = "background";
    background.width = app.screen.width;
    background.height = app.screen.height;

    let person = PIXI.Sprite.from("person.png");
    person.name = "person";
    person.interactive = true;
    person.buttonMode = true;
    person.width = unit;
    person.height = unit;
    person.anchor.set(0.5);

    person
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', personDragMove);

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

    app.stage.addChild(background);
    app.stage.addChild(person);
    app.stage.addChild(car);

    setupInputs();

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

        app.stage.children.forEach((child) => child.interactive = false);

        let bar = loadingPane.querySelector('.bar');
        bar.style.width = "0px";
        setTimeout(() => bar.style.width = "calc(100% - 8px)", 50);
    });

    document.querySelectorAll('.pane').forEach((pane) => {
        let randBtn = pane.querySelector('.button.random');
        if(!randBtn) return;
        let inputs = pane.querySelectorAll('.input');
        randBtn.addEventListener('click', () => {
            inputs.forEach((inp) => {
                let prop = inp.dataset.prop;
                let range = ranges[prop];
                if(!range) range = [0, 100];
                let diff = range[1] - range[0];
                inp.innerHTML = range[0] + Math.floor(Math.random() * diff);
                performChanges(inp);
            });
        });
    });
});

function clamp(n, lower, upper) {
    return Math.min(Math.max(lower, n), upper);
}

function forceBlur() {
    var temp = document.createElement("input");
    document.body.appendChild(temp);
    temp.focus();
    document.body.removeChild(temp);
}

function isDigit(char) {
    return char.length == 1 && (char >= '0' && char <= '9');
}

function performChanges(inp) {
    let obj = app.stage.getChildByName(inp.dataset.obj);
    let value = parseInt(inp.innerHTML) * unit;
    obj[inp.dataset.prop] = isNaN(value) ? unit : value;
}

function setupInputs() {
    let inputs = document.querySelectorAll('.pane .input');
    inputs.forEach((inp) => {
        performChanges(inp);
        inp.addEventListener('keydown', (e) => {
            if(e.key == "Backspace" || isDigit(e.key)) {

            } else if(e.key == "Enter") {
                forceBlur();
                e.preventDefault();
            } else if(e.key.search("Arrow") == -1) {
                e.preventDefault();
            }
        });
        inp.addEventListener('keyup', (e) => {
            performChanges(inp);
        });
        inp.addEventListener('focusout', (e) => {
            if(isNaN(parseInt(inp.innerText))) inp.innerHTML = "1";
            performChanges(inp);
        });
    });
}

function onDragStart(event) {
    this.dragging = true;
    this.data = event.data;
}

function onDragEnd() {
    this.dragging = false;
}

function carDragMove() {
    if(this.dragging) {
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
    if(this.dragging) {
        const newPosition = this.data.getLocalPosition(this.parent);
        let grid_x = clamp(Math.round(newPosition.x / unit), 0, 100);
        let grid_y = clamp(Math.round(newPosition.y / unit), 0, 15);
        this.x = grid_x * unit;
        this.y = grid_y * unit;
        person_input_x.innerHTML = grid_x;
        person_input_y.innerHTML = grid_y;
    }
}

