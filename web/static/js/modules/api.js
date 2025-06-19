export const API_BASE_URL = "http://localhost:5001";
export const API_BASE_URL_CHAT = "http://localhost:5002";

const fetchConfig = {
    credentials: 'include',  // ¡IMPORTANTE! Incluir cookies
    headers: {
        'Content-Type': 'application/json'
    }
};

export async function fetchWithCredentials(url, options = {}) {
    const config = {
        ...fetchConfig,
        ...options,
        headers: {
            ...fetchConfig.headers,
            ...(options.headers || {})
        }
    };
    
    return fetch(url, config);
}