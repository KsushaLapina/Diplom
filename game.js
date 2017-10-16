'use strict';

class Vector {
    constructor (x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw Error ('Можно прибавлять к вектору только вектор типа Vector');
        }
        return new Vector(this.x + vector.x, this.y + vector.y);
    }
    times(multiplier) {
        return new Vector (this.x * multiplier, this.y * multiplier);
    }
}

class Actor {
    constructor(pos = new Vector(0,0), size = new Vector(1,1), speed = new Vector(0,0)) {

        if (!(pos instanceof Vector)) {
            throw new Error('pos не является объектом типа Vector');
        }
        if (!(size instanceof Vector)) {
            throw new Error('size не является объектом типа Vector');
        }
        if (!(speed instanceof Vector)) {
            throw new Error('speed не является объектом типа Vector');
        }

        this.pos = pos;
        this.size = size;
        this.speed = speed;

    }

    act() {}

    get left() {
        return this.pos.x;
    }
    get top() {
        return this.pos.y;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }
    get type() {
        return 'actor';
    }

    isIntersect(movingObj) {
        if (!(movingObj instanceof Actor)) {
            throw new Error('Аргумент должен быть экземпляром класса Actor');
        }
        if (movingObj === this) return false;
        if (movingObj.left >= this.right) return false;
        if (movingObj.top >= this.bottom) return false;
        if (movingObj.right <= this.left) return false;
        if (movingObj.bottom <= this.top) return false;
        if ((movingObj.size.x < 0) || (movingObj.size.y < 0)) return false;
        return true;
    }
}

class Level {

    constructor (grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.player = this.actors.find(actor => actor.type == 'player');
        this.status = null;
        this.finishDelay = 1;
        this.height = this.grid.length;
        this.width = this.height > 0 ? Math.max.apply(Math, this.grid.map(function(el) {
            return el.length;
        })) : 0;
    }

    isFinished () {
        if ((this.status !== null) && (this.finishDelay < 1)) {
            return true;
        }
        return false;
    }

    actorAt(movingObj) {
        if (!(movingObj instanceof Actor)) {
            throw Error('не объект Actor');
        }
        return this.actors.find(actor => actor.isIntersect(movingObj));
    }

    obstacleAt(pos, size) {
        var leftBorder = Math.floor(pos.x);
        var rightBorder = Math.ceil(pos.x + size.x);
        var topBorder = Math.floor(pos.y);
        var bottomBorder = Math.ceil(pos.y + size.y);

        if (leftBorder < 0 || rightBorder > this.width || topBorder < 0) {
            return "wall";
        }

        if (bottomBorder > this.height) {
            return "lava";
        }

        for (var y = topBorder; y < bottomBorder; y++) {
            for (var x = leftBorder; x < rightBorder; x++) {
                var fieldType = this.grid[y][x];
                if (fieldType) {
                    return fieldType;
                }
            }
        }
    }

    removeActor(obj) {
        var indexObj = this.actors.indexOf(obj);
        if (indexObj !== -1){
            this.actors.splice(indexObj, 1);
        }
    }

    noMoreActors(type) {
        return !this.actors.some(actor => actor.type === type);
    }

    playerTouched(type, movingObj) {
        var _this = this;
        if (this.status !== null) {
            return false;
        } else if ((type === "lava") || (type === "fireball")) {
            this.status = "lost";
            this.finishDelay = 1;
        } else if (type === "coin") {
            this.actors = this.actors.filter(obj => obj !== movingObj);
            if (this.noMoreActors('coin')) {
                this.status = "won";
                this.finishDelay = 1;
            }
        }
    }
}

class LevelParser {

    constructor (dictionary) {
        this.dictionary = dictionary;
    }

    actorFromSymbol(symbol) {
        if (symbol === undefined) {
            return undefined;
        }
        if (Object.keys(this.dictionary).indexOf(symbol) !== -1){
            return this.dictionary[symbol];
        }
        return undefined;
    }

    obstacleFromSymbol(symbol) {
        if (symbol === 'x') {
            return 'wall';
        }else if (symbol === '!') {
            return 'lava';
        } else {
            return undefined;
        }
    }

    createGrid(arrayString) {
        let arr = [];
        for (var i = 0; i < arrayString.length; i++) {
            arr[i] = [];
            for (var n = 0; n < arrayString[i].length; n++) {
                arr[i][n] = this.obstacleFromSymbol(arrayString[i][n]);
            }
        }
        return arr;
    }

    createActors(arrayString) {
        const arrayMovingObj = [];

        if (this.dictionary) {
            arrayString.forEach((line, y) => {
                line.split('').forEach((symbol, x) => {
                    if (typeof this.dictionary[symbol] === 'function') {
                        const actor = new this.dictionary[symbol](new Vector (x,y));
                            if (actor instanceof Actor) {
                                arrayMovingObj.push(actor);
                            }
                    }
                });
            });
        }
        return arrayMovingObj;
    }

    parse(arrayString) {
        return new Level (this.createGrid(arrayString), this.createActors(arrayString));
    }
}

class Fireball extends Actor {
    constructor (pos = new Vector(0,0), speed = new Vector(0,0)) {
        super(pos, new Vector (1,1), speed);
    }

    get type() {
        return 'fireball';
    }

    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
        //return new Vector (this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
    }

    handleObstacle() {
        this.speed = this.speed.times(-1);
    }

    act(time, level) {
        var newPosition = this.getNextPosition(time);
        if (level.obstacleAt(newPosition,this.size)) {
            this.handleObstacle();
        } else {
            this.pos = newPosition;
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor (pos) {
        super (pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor (pos) {
        super (pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        super(pos);
        this.speed.y = 3;
        this.startPos = pos;
    }

    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector()) {
        super(pos, new Vector(0.6, 0.6));
        this.pos = this.pos.plus(new Vector(0.2, 0.1));
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * 2 * Math.PI;
        this.startPos = this.pos;
    }

    get type() {
        return 'coin';
    }

    updateSpring(time = 1) {
        this.spring = this.spring + this.springSpeed * time;
    }

    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }

    getNextPosition(time = 1) {
        this.updateSpring(time);
        return this.startPos.plus(this.getSpringVector());
    }

    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector()) {
        super(pos, new Vector(0.8, 1.5), new Vector(0, 0));
        this.pos.y -= 0.5;
    }

    get type() {
        return 'player';
    }
}

const actorDict = {
    '@': Player,
    'v': FireRain,
    '=': HorizontalFireball,
    '|': VerticalFireball,
    'o': Coin
};

const parser = new LevelParser(actorDict);

loadLevels()
    .then(schemas => runGame(JSON.parse(schemas), parser, DOMDisplay))
.then(() => alert('Вы выиграли!'))
.catch(err => alert(err));

