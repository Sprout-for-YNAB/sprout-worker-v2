import { Env } from "../../worker-configuration";

export const generateCorsHeaders = (requestOrigin: string | null, env: Env) => {
  let origin = env.VALID_ORIGINS[0];
  if (requestOrigin && env.VALID_ORIGINS.includes(requestOrigin)) {
    origin = requestOrigin;
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
};

export const getCookie = (name: string, header: string | null) => {
  if (!header) {
    return "";
  }
  const cookies = header.split(";");
  const value = cookies.find((cookieStr) => cookieStr.includes(name));
  return value?.split("=")[1] ?? "";
};

export const isValidClient = (requestOrigin: string | null, env: Env) => {
  return requestOrigin ? env.VALID_ORIGINS.includes(requestOrigin) : false;
};
