const LOCAL_API_URL = "http://127.0.0.1:8787";

function normalizeBaseUrl(value) {
	return value ? value.replace(/\/+$/, "") : "";
}

const configuredApiUrl = process.env.REACT_APP_API_URL?.trim();
const fallbackApiUrl = process.env.NODE_ENV === "development" ? LOCAL_API_URL : "";

export const BASE_URL = normalizeBaseUrl(configuredApiUrl || fallbackApiUrl);