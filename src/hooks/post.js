import { useCallback, useState } from "react";
import useAxiosPublic from "./Axios"

export const usePostData = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const axios = useAxiosPublic();

    const postData = useCallback(async (apiRoute, payload) => {
        if (!apiRoute) return;
        setError(null);
        setLoading(true);
        try {
            const res = await axios.post(apiRoute, payload);
            return res.data;
        } catch (err) {
            if (err.response.data.type ==="error") {
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


    return { postData, error, loading };
};