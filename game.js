'use strict';
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error(`Можно прибавлять к вектору только вектор типа Vector`);
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  times(num) {
    return new Vector(this.x * num, this.y * num);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
      throw new Error(`Расположение, размер и скорость должны быть объектом Vector`);
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }
  act() {

  }
  get left() {
    return this.pos.x;
  }
  get top() {
    return this.pos.y;
  }
  get right() {
    return this.size.x + this.pos.x;
  }
  get bottom() {
    return this.size.y + this.pos.y;
  }
  get type() {
    return 'actor';
  }
  isIntersect(actor) {
    if (!(actor instanceof Actor) || (!actor)) {
      throw new Error(`Не является экземпляром Actor или не передано аргументов`);
    }
    if (this === actor) {
      return false;
    }
    return this.right > actor.left && this.left < actor.right && this.top < actor.bottom && this.bottom > actor.top;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid.slice();
    this.actors = actors.slice();
    this.player = this.actors.find(actor => actor.type === 'player');
    this.height = this.grid.length;
    this.width = this.grid.reduce((acc, line) => {
      return line.length > acc ? line.length : acc;
    }, 0);
    this.status = null;
    this.finishDelay = 1;
  }
  isFinished() {
    return (this.status != null) && (this.finishDelay < 0)
  }
  actorAt(actor) {
    return this.actors.find(act => actor.isIntersect(act));
  }
  obstacleAt(pos, size) {
    if (!(pos instanceof Vector) || !(size instanceof Vector)) {
      throw new Error('Можно передавать только объекты типа Vector');
    }
    const left = Math.floor(pos.x);
    const right = Math.ceil(pos.x + size.x);
    const top = Math.floor(pos.y);
    const bottom = Math.ceil(pos.y + size.y);

    if (bottom > this.height) {
      return 'lava';
    } 

    if (left < 0 || right > this.width || top < 0) {
      return "wall";
    }

    for (let y = top; y < bottom; y++) {
      for (let x = left; x < right; x++) {
        const obstacle = this.grid[y][x];
        if (obstacle) {
          return obstacle;
        }
      }
    }
  }
  removeActor(actor) {
    this.actors = this.actors.filter(act => act !== actor);
  }
  noMoreActors(type) {
    return !this.actors.some(el => el.type === type);
  }
  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    }
    if (type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(dictionary = {}) {
    this.dictionary = Object.assign({}, dictionary);
  }
  actorFromSymbol(symbol) {
    return this.dictionary[symbol];
  }
  obstacleFromSymbol(symbol) {
    if (symbol === "x") {
      return "wall"
    }
    if (symbol === "!") {
      return "lava"
    }  
  }
  createGrid(plan) {
    return plan.map(line => line.split('')).map(symbol => symbol.map(symbol => this.obstacleFromSymbol(symbol)));  
  }
  createActors(strings) {
        return strings.reduce((prev, string, y) => {
            string.split('').forEach((symbol, x) => {
                const func = this.actorFromSymbol(symbol);
                if (typeof func === 'function') {
                    const actor = new func(new Vector(x, y));
                    if (actor instanceof Actor) {
                        prev.push(actor);
                    }
                }
            });
            return prev;
        }, []);
    }
  parse(strings) {
    return new Level(this.createGrid(strings), this.createActors(strings));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed)
  }
  get type() {
    return 'fireball';
  }
  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  act(time, level) {
    const newPosition = this.getNextPosition(time);
    if (!level.obstacleAt(newPosition, this.size)) {
      this.pos = newPosition;
    } else {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(2, 0))
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 2))
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 3))
    this.begin = pos;
  }
  handleObstacle() {
    this.pos = this.begin;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
    this.realPos = this.pos;
  }
  get type() {
    return 'coin';
  }
  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }
  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }
  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.realPos.plus(this.getSpringVector());
  }
  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }
  get type() {
    return 'player'
  }
}
const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball
}
const parser = new LevelParser(actorDict);

loadLevels()
  .then( (schemasJSON) => JSON.parse(schemasJSON) )
  .catch( (err) => console.log('Произошла ошибка ' + err) )
  .then( (schemas) => runGame(schemas, parser, DOMDisplay) )
  .then( () => alert('Вы победили!!!') )