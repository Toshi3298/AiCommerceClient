export interface RegisterRequest {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface RegisterResponseData {
    userId: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponseData {
    token: string;
    expiresAt: string;
}
