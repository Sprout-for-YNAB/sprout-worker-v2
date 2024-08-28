import { ErrorObj } from "../../worker-configuration";

export const sendError = (errorMessage: string, status: number | string) => {
  if (typeof status === "string") {
    status = parseInt(status);
  }
  let error;
  switch (status) {
    case 400:
      error = "invalid_request";
      break;
    case 401:
      error = "unauthroized";
      break;
    case 404:
      error = "not_found";
      break;
    case 405:
      error = "method_not_allowed";
      break;
    case 429:
      error = "too_many_requests";
      break;
    case 500:
      error = "server_error";
      break;
    default:
      error = "error";
      break;
  }
  const errorObj: ErrorObj = {
    error,
    error_description: errorMessage
  };
  console.error("sendError", { status, error, errorMessage });
  return new Response(JSON.stringify(errorObj), { status });
};

export const sendYnabError = (ynabJson: ErrorObj, status: number, statusText: string) => {
  return new Response(JSON.stringify(ynabJson), { status, statusText });
};
