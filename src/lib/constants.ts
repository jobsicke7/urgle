// Use environment variables so dev/prod can point to different AI backends.
// On the client, NEXT_PUBLIC_* vars are exposed; on the server we can use LOOK_ALIKE_API_URL.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://beta.jobsicke.com';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'https://beta.jobsicke.com';