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
    // здесь можно создать копии массивов,
    // чтобы поля обхекта нельзя было изменить извне
    this.grid = grid;
    this.actors = actors;
    this.player = this.actors.find(actor => actor.type === 'player');
    this.height = this.grid.length;
    // лучше избегать имён переменных вроде a и b
    // тут подошло бы acc (часто используется как название
    // первого аргумента функции обратного вызова передаваемой в reduce)
    // и, например, line
    this.width = this.grid.reduce((a, b) => {
      return b.length > a ? b.length : a;
    }, 0);
    this.status = null;
    this.finishDelay = 1;
  }
  isFinished() {
    // если выражение в if имеет значене true или false,
    // а внутри return, то можно писать просто
    // return <выражение>
    // !(this.status === null) - тут лушче просто использовать оператор "не равно"
    if (!(this.status === null) && (this.finishDelay < 0)) {
      return true;
    } else {
      return false;
    }
  }
  actorAt(actor) {
    return this.actors.find(act => actor.isIntersect(act));
  }
  obstacleAt(pos, size) {
    try {
      if (!(pos instanceof Vector) || !(size instanceof Vector)) {
        throw (`Расположение, и размер должны быть объектом Vector`)
      }
    } catch (e) {
      // съедаете ошибку,
      // вообще тут не нужен try/catch
      console.log(e);
    }
    const left = Math.floor(pos.x);
    const right = Math.ceil(pos.x + size.x);
    const top = Math.floor(pos.y);
    const bottom = Math.ceil(pos.y + size.y);

    if (bottom > this.height) {
      return 'lava';
    // в if return, поэтому else можно не писать
    } else if (left < 0 || right > this.width || top < 0) {
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
    // здесь можно создать копию объекта,
    // чтобы нельзя было изменить поле извне
    this.dictionary = dictionary;
  }
  actorFromSymbol(symbol) {
    return this.dictionary[symbol];
  }
  obstacleFromSymbol(symbol) {
    // фигурные скобки лучше не опускать
    if (symbol === "x") return "wall"
    if (symbol === "!") return "lava"
  }
  createGrid(strings) {
    const grid = [];
    // лучше переделать на map
    strings.forEach((string) => {
      let str = string.split('');
      const elements = [];
      str.forEach((symbol) => {
        elements.push(this.obstacleFromSymbol(symbol));
      });
      grid.push(elements);
    });
    return grid;
  }
  createActors(strings) {
    const actors = [];
    // здесь можно использовать reduce
    strings.forEach((string, y) => {
      let str = string.split('');
      str.forEach((symbol, x) => {
        if (typeof this.actorFromSymbol(symbol) === 'function') {
          let Constr = Object(this.actorFromSymbol(symbol))
          let obj = new Constr(new Vector(x, y))
          if (obj instanceof Actor) {
            actors.push(obj)
          }
        }
      });
    });
    return actors
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
    // тут лучше использовать методы класса Vector
    return new Vector(this.pos.x + (this.speed.x * time), this.pos.y + (this.speed.y * time))
  }
  handleObstacle() {
    // лучше не мутировать объекты класса Vector
    // + тут тоже можно использовать метод этого класса
    this.speed.x = -this.speed.x;
    this.speed.y = -this.speed.y;
  }
  act(time, level) {
    const newPosition = this.getNextPosition(time);
    // в данном случае тренарный оператор сравнения затрудные чтение
    level.obstacleAt(newPosition, this.size) ? this.handleObstacle() : this.pos = newPosition;
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

const schemas = [
  [
    '         ',
    '         ',
    '    =    ',
    '       o ',
    '     !xxx',
    ' @       ',
    'xxx!     ',
    '         '
  ],
  [
    '      v  ',
    '    v    ',
    '  v      ',
    '        o',
    '        x',
    '@   x    ',
    'x        ',
    '         '
  ]
];
const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball

};
const parser = new LevelParser(actorDict);
runGame(schemas, parser, DOMDisplay)
  .then(() => console.log('Вы выиграли приз!'));