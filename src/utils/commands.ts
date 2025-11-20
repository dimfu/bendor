class Commands<T> {
  // The undo stack
  past: T[];
  // The present value
  present: T;
  // The redo stack
  future: T[];
  constructor(value: T) {
    this.past = [];
    this.present = value;
    this.future = [];
  }

  canUndo() {
    return this.past.length !== 0;
  }

  canRedo() {
    return this.future.length !== 0;
  }

  undo() {
    if (this.past.length === 0) {
      return this;
    }

    const previous = this.past[this.past.length - 1];
    const newPast = this.past.slice(0, this.past.length - 1);

    const oldPresent = this.present;
    this.past = newPast;
    this.present = previous;
    this.future = [oldPresent, ...this.future];

    return this;
  }

  redo() {
    if (this.future.length === 0) {
      return this;
    }
    const next = this.future[0];
    const newFuture = this.future.slice(1);
    this.past = [...this.past, this.present];
    this.present = next;
    this.future = newFuture;
    return this;
  }

  set(value: T) {
    this.past = [...this.past, this.present];
    this.present = value;
    this.future = [];
    return this;
  }

  // reset the commands state
  reset(newValue: T) {
    this.past = [];
    this.present = newValue;
    this.future = [];
    return this;
  }
}

export default Commands;
