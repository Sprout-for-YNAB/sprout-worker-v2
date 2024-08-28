import { sendError, sendYnabError } from "./lib/errors";
import { generateCorsHeaders, getCookie } from "./lib/utilities";
import { ynabOauthUrl } from "./lib/constants";
import { Env, ErrorObj, OauthResponse } from "../worker-configuration";

export const oauth = async (request: Request, env: Env) => {
  const { headers } = request;
  const bodyJson: URLSearchParams = await request.json();
  const params = new URLSearchParams(bodyJson);
  params.append("grant_type", "authorization_code");
  if (!params.has("code") || !params.has("redirect_uri")) {
    const missingObj = [
      !params.has("code") ? "code" : null,
      !params.has("redirect_uri") ? "redirect_uri" : null
    ].filter((str) => str !== null);
    return sendError(`Missing: ${missingObj.join(", ")}`, 400);
  }
  return sendRequest(headers, params, env);
};

export const refresh = async (request: Request, env: Env, responseHeaders: Headers) => {
  const { headers } = request;
  const refreshToken = getCookie("refreshToken", headers.get("Cookie"));
  const params = new URLSearchParams();

  params.append("client_id", env.YNAB_CLIENT_ID);
  params.append("client_secret", env.YNAB_CLIENT_SECRET);
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", encodeURIComponent(refreshToken));
  const refreshUrl = new URL(`?${params.toString()}`, ynabOauthUrl);

  const ynabResponse = await fetch(refreshUrl, {
    method: "POST"
  });
  if (!ynabResponse.ok) {
    const errorResponse: ErrorObj = await ynabResponse.json();
    console.error("refresh error", ynabResponse.status, errorResponse);
    throw {
      name: errorResponse.error,
      detail: errorResponse.error_description,
      id: ynabResponse.status
    };
  }
  const responseJson: OauthResponse = await ynabResponse.json();
  const expiryTime = (responseJson.created_at + responseJson.expires_in) * 1000;
  const expiresAt = new Date(expiryTime).toUTCString();

  responseHeaders.append(
    "Set-Cookie",
    `accessToken=${responseJson.access_token}; Expires=${expiresAt};${
      env.LEVEL !== "local" ? " Secure; " : " "
    }HttpOnly; SameSite=Strict; Domain=${
      env.LEVEL === "local" ? "localhost" : ".[WORKER_URL]"
    }; Path=/`
  );
  responseHeaders.append(
    "Set-Cookie",
    `refreshToken=${responseJson.refresh_token};${
      env.LEVEL !== "local" ? " Secure; " : " "
    }HttpOnly; SameSite=Strict; Domain=${
      env.LEVEL === "local" ? "localhost" : ".[WORKER_URL]"
    }; Path=/`
  );
};

const sendRequest = async (headers: Headers, params: URLSearchParams, env: Env) => {
  params.append("client_id", env.YNAB_CLIENT_ID);
  params.append("client_secret", env.YNAB_CLIENT_SECRET);
  const url = new URL(`?${params.toString()}`, ynabOauthUrl);

  const ynabResponse = await fetch(url, {
    method: "POST"
  });
  if (!ynabResponse.ok) {
    const errorResponse: ErrorObj = await ynabResponse.json();
    console.error("access error", errorResponse);
    return sendYnabError(errorResponse, ynabResponse.status, ynabResponse.statusText);
  }
  const responseJson: OauthResponse = await ynabResponse.json();
  const expiryTime = (responseJson.created_at + responseJson.expires_in) * 1000;
  const expiresAt = new Date(expiryTime).toUTCString();

  const responseHeaders = new Headers(generateCorsHeaders(headers.get("Origin"), env));
  responseHeaders.append(
    "Set-Cookie",
    `accessToken=${responseJson.access_token}; Expires=${expiresAt};${
      env.LEVEL !== "local" ? " Secure; " : " "
    }HttpOnly; SameSite=Strict; Domain=${
      env.LEVEL === "local" ? "localhost" : ".[WORKER_URL]"
    }; Path=/`
  );
  responseHeaders.append(
    "Set-Cookie",
    `refreshToken=${responseJson.refresh_token};${
      env.LEVEL !== "local" ? " Secure; " : " "
    }HttpOnly; SameSite=Strict; Domain=${
      env.LEVEL === "local" ? "localhost" : ".[WORKER_URL]"
    }; Path=/`
  );
  return new Response(null, {
    headers: responseHeaders,
    status: 204,
    statusText: "No Content"
  });
};
