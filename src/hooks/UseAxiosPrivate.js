import { useEffect } from 'react';
import useAxiosPublic from './Axios';
import axiosPrivate from './AxiosPrivate';
import { useAuth } from '../dashboard/auth/AuthContext';

// Use this for any call that needs the logged-in user's identity
// (protected backend routes). Use useAxiosPublic for login/register/refresh,
// which don't need an access token.
const useAxiosPrivate = () => {
    const { accessToken, setAccessToken } = useAuth();
    const axiosPublic = useAxiosPublic();
    const axiosPrivateInstance = axiosPrivate();
    useEffect(() => {
        const requestIntercept = axiosPrivateInstance.interceptors.request.use(
            (config) => {
                if (!config.headers['Authorization']) {
                    config.headers['Authorization'] = `Bearer ${accessToken}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const responseIntercept = axiosPrivateInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                const prevRequest = error?.config;

                // Only attempt one silent-refresh-and-retry per request, and never
                // for the refresh call itself (would loop forever if refresh also 401s).
                if (error?.response?.status === 401 && !prevRequest?._retry) {
                    prevRequest._retry = true;
                    try {
                        const { data } = await axiosPublic.post('/api/refresh');
                        setAccessToken(data.accessToken);
                        prevRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
                        return axiosPrivateInstance(prevRequest);
                    } catch (refreshError) {
                        setAccessToken(null); // refresh cookie is dead too — user needs to log in again
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );

        // Clean up old interceptors whenever accessToken changes, so they
        // don't stack up and fire multiple times per request.
        return () => {
            axiosPrivateInstance.interceptors.request.eject(requestIntercept);
            axiosPrivateInstance.interceptors.response.eject(responseIntercept);
        };
    }, [accessToken, axiosPublic, axiosPrivateInstance, setAccessToken]);

    return axiosPrivateInstance;
};

export default useAxiosPrivate;