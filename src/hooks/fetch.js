import { useState, useCallback } from "react";
import useAxiosPublic from "./Axios";

export const useFetchData = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const axios = useAxiosPublic();

    const fetchData = useCallback(async (apiRoute) => {
        if (!apiRoute) return;
        setError(null);
        setLoading(true);

        try {
            const res = await axios.get(apiRoute);
            return res.data;
        } catch (err) {
            if (err.response) {
                setError({
                    status: err.response.status,
                    message: err.response.data?.message || 'An error occurred.',
                });
            } else {
                setError({ status: null, message: err.message });
            }
        } finally {
            setLoading(false);
        }
    }, [axios]);

    return { fetchData, error, loading };
};