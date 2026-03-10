import axios from 'axios';

const axiosPublic = axios.create({
    baseURL: "https://erp-1-4dlq.onrender.com",
    // baseURL: "http://127.0.0.1:5000",
    withCredentials: true,
});

const useAxiosPublic = () => {
    return axiosPublic;
};

export default useAxiosPublic;