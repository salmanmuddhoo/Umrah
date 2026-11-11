/** An error that is safe to show to the client, with the HTTP status to send. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new ApiError(400, message);
export const forbidden = (message = "You do not have access to this.") => new ApiError(403, message);
export const notFound = (message = "Not found.") => new ApiError(404, message);
