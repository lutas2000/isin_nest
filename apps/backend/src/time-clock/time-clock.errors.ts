export class TimeClockError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly command?: number,
  ) {
    super(message);
    this.name = 'TimeClockError';
  }
}

export class TimeClockConnectionError extends TimeClockError {
  constructor(message: string) {
    super(message, 'TIME_CLOCK_CONNECTION_ERROR');
    this.name = 'TimeClockConnectionError';
  }
}

export class TimeClockProtocolError extends TimeClockError {
  constructor(message: string, command?: number) {
    super(message, 'TIME_CLOCK_PROTOCOL_ERROR', command);
    this.name = 'TimeClockProtocolError';
  }
}

export class TimeClockUnsupportedError extends TimeClockError {
  constructor(message: string) {
    super(message, 'TIME_CLOCK_UNSUPPORTED');
    this.name = 'TimeClockUnsupportedError';
  }
}
