export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

export class NotYourTurnError extends EngineError {
  constructor() {
    super("Not your turn");
    this.name = "NotYourTurnError";
  }
}

export class InvalidMoveError extends EngineError {
  constructor(message = "Invalid move") {
    super(message);
    this.name = "InvalidMoveError";
  }
}
