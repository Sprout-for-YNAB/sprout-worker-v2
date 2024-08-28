import { Env, YnabError } from "../worker-configuration";
import { oauth, refresh } from "./authentication";
import { getBudgets, getBudget, sendTransaction } from "./budget";
import { ROUTES, pathnamePrefix } from "./lib/constants";
import { sendError } from "./lib/errors";
import { generateCorsHeaders, getCookie, isValidClient } from "./lib/utilities";

const handleOptions = (request: Request, env: Env) => {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    return new Response(null, {
      headers: generateCorsHeaders(request.headers.get("Origin"), env),
      status: 204
    });
  }
  return sendError("Invalid OPTIONS request", 400);
};

const handleGetRequest = async (request: Request, env: Env) => {
  const { headers, url } = request;
  let accessToken = getCookie("accessToken", headers.get("Cookie"));
  const refreshToken = getCookie("refreshToken", headers.get("Cookie"));

  const responseHeaders = new Headers(generateCorsHeaders(headers.get("Origin"), env));

  if (!refreshToken) {
    return sendError("Unauthorized", 401);
  }

  try {
    if (!accessToken) {
      await refresh(request, env, responseHeaders);
      accessToken = getCookie("accessToken", responseHeaders.get("Set-Cookie"));
    }
    const { pathname, searchParams } = new URL(url);
    const actualPathname = env.LEVEL === "local" ? pathname : pathname.split(pathnamePrefix)[1];
    const id = searchParams.get("id");
    switch (actualPathname) {
      case ROUTES.budgets:
        return getBudgets(responseHeaders, accessToken);
      case ROUTES.budget:
        return id ? getBudget(responseHeaders, accessToken, id) : sendError("Bad request", 400);
      default:
        if (Object.values(ROUTES).includes(actualPathname)) {
          return sendError(`${request.method} not allowed on ${actualPathname}`, 405);
        }
        return sendError(`${actualPathname} not found`, 404);
    }
  } catch (err) {
    console.error("GET error", err);
  }
};

const handlePostRequest = async (request: Request, env: Env) => {
  const { headers, url } = request;
  const { pathname } = new URL(url);
  const actualPathname = env.LEVEL === "local" ? pathname : pathname.split(pathnamePrefix)[1];

  const validClient = isValidClient(headers.get("Origin"), env);
  if (!validClient) {
    return sendError("Unauthorized client", 403);
  }

  try {
    if (actualPathname === ROUTES.oauth) {
      return oauth(request, env);
    }
    let accessToken = getCookie("accessToken", headers.get("Cookie"));
    const refreshToken = getCookie("refreshToken", headers.get("Cookie"));

    const responseHeaders = new Headers(generateCorsHeaders(headers.get("Origin"), env));

    if (!refreshToken) {
      return sendError("Unauthorized", 401);
    }
    if (!accessToken) {
      await refresh(request, env, responseHeaders);
      accessToken = getCookie("accessToken", responseHeaders.get("Set-Cookie"));
    }
    switch (actualPathname) {
      case ROUTES.transaction:
        return sendTransaction(request, responseHeaders, accessToken);
      default:
        if (Object.values(ROUTES).includes(actualPathname)) {
          return sendError(`${request.method} not allowed on ${actualPathname}`, 405);
        }
        return sendError(`${actualPathname} not found`, 404);
    }
  } catch (error) {
    console.error("POST error", error);
  }
};

export default {
  async fetch(request: Request, env: Env) {
    switch (request.method) {
      case "OPTIONS":
        return handleOptions(request, env);
      case "GET":
        return handleGetRequest(request, env);
      case "POST":
        return handlePostRequest(request, env);
      default:
        return sendError(`${request.method} not allowed`, 405);
    }
  }
};
