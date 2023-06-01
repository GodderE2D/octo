type CommandErrorOptions = {
  message: string;
  show?: boolean;
  ephemeral?: boolean;
  cause?: Error;
};

class CommandError extends Error {
  public show: boolean;
  public ephemeral: boolean;
  public cause?: Error;

  constructor(options: CommandErrorOptions) {
    super(options.message);
    this.name = "CommandError";
    this.message = options.message;
    this.show = options.show ?? false;
    this.ephemeral = options.ephemeral ?? true;
    this.cause = options.cause;
  }
}

export default CommandError;
