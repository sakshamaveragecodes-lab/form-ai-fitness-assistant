export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Form-Action": "1" },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new ApiClientError(
      "The server could not be reached. Please try again.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiClientError(
      body.error ?? "Something went wrong. Please try again.",
      response.status,
    );
  return body;
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
