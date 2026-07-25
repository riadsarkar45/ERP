import { useEffect, useRef } from 'react';
import useAxiosPublic from './Axios';
import { useAuth } from '../dashboard/auth/AuthContext';
import useAxiosSecureBase from './AxiosPrivate';

const useAxiosPrivate = () => {
    const { accessToken, setAccessToken } = useAuth();
    const axiosPublic = useAxiosPublic();
    const axiosPrivateInstance = useAxiosSecureBase();
    const refreshPromiseRef = useRef(null); // shared in-flight refresh, deduped across concurrent 401s

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

                if (error?.response?.status === 401 && !prevRequest?._retry) {
                    prevRequest._retry = true;

                    try {
                        // If a refresh is already in flight, piggyback on it instead of
                        // starting a second one that would race against the rotated token.
                        if (!refreshPromiseRef.current) {
                            refreshPromiseRef.current = axiosPublic
                                .post('/api/auth/refresh') // fixed: match AuthContext's endpoint
                                .then(({ data }) => {
                                    setAccessToken(data.accessToken);
                                    return data.accessToken;
                                })
                                .finally(() => {
                                    refreshPromiseRef.current = null;
                                });
                        }

                        const newAccessToken = await refreshPromiseRef.current;
                        prevRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                        return axiosPrivateInstance(prevRequest);
                    } catch (refreshError) {
                        setAccessToken(null);
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => {
            axiosPrivateInstance.interceptors.request.eject(requestIntercept);
            axiosPrivateInstance.interceptors.response.eject(responseIntercept);
        };
    }, [accessToken, axiosPublic, axiosPrivateInstance, setAccessToken]);

    return axiosPrivateInstance;
};

export default useAxiosPrivate;