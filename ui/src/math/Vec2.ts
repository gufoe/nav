/** Mutable 2D vector. Units are meters unless noted. */
export class Vec2 {
  x: number
  y: number

  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  static readonly zero = new Vec2(0, 0)

  static from(x: number, y: number): Vec2 {
    return new Vec2(x, y)
  }

  static fromAngle(radians: number, length = 1): Vec2 {
    return new Vec2(Math.cos(radians) * length, Math.sin(radians) * length)
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y)
  }

  set(x: number, y: number): this {
    this.x = x
    this.y = y
    return this
  }

  copy(v: Vec2): this {
    this.x = v.x
    this.y = v.y
    return this
  }

  add(v: Vec2): this {
    this.x += v.x
    this.y += v.y
    return this
  }

  sub(v: Vec2): this {
    this.x -= v.x
    this.y -= v.y
    return this
  }

  scale(s: number): this {
    this.x *= s
    this.y *= s
    return this
  }

  length(): number {
    return Math.hypot(this.x, this.y)
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y
  }

  normalize(): this {
    const len = this.length()
    if (len > 0) this.scale(1 / len)
    return this
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y
  }

  /** 2D cross product magnitude (signed). */
  cross(v: Vec2): number {
    return this.x * v.y - this.y * v.x
  }

  angle(): number {
    return Math.atan2(this.y, this.x)
  }

  rotate(radians: number): this {
    const c = Math.cos(radians)
    const s = Math.sin(radians)
    const { x, y } = this
    this.x = x * c - y * s
    this.y = x * s + y * c
    return this
  }

  lerp(target: Vec2, t: number): this {
    this.x += (target.x - this.x) * t
    this.y += (target.y - this.y) * t
    return this
  }

  equals(v: Vec2, epsilon = 1e-9): boolean {
    return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon
  }

  toString(): string {
    return `Vec2(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`
  }
}
