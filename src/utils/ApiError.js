class ApiError extends Error {
  constructor(
    statusCode,
    massage = "Somthing went wrong",
    errors = [],
    stack = ""
  ) {
    super(massage);
    this.statusCode = statusCode;
    this.errors = errors;
    this.data = null;
    this.success = false;
    this.massage = massage;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
