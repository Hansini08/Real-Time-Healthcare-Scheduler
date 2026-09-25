// frontend/src/api.js
import axios from 'axios';

// Retrieve the base URL from the environment variable, with a fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003/api';

if (!API_BASE_URL || API_BASE_URL === '/api') { // Check if it's properly set
    console.warn("VITE_API_BASE_URL is not defined or invalid in .env file. Using default fallback.");
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor to automatically add JWT token to requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken'); // Get token from local storage
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        // Remove Authorization header if no token (important for public routes like login/register)
        else {
             delete config.headers['Authorization'];
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Optional: Interceptor to handle common errors like 401 Unauthorized
apiClient.interceptors.response.use(
    (response) => response, // Pass through successful responses
    (error) => {
        if (error.response && error.response.status === 401) {
            // Handle unauthorized access - e.g., force logout
            console.warn("Unauthorized access (401). Token might be invalid or expired.");
            // Example: Redirect to login or clear token
            // localStorage.removeItem('authToken');
            // window.location.href = '/login'; // Force reload/redirect
        }
         // Return the error so components can handle specific messages
        return Promise.reject(error);
    }
);


export default apiClient;