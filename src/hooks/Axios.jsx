import axios from 'axios';

const axiosPublic = axios.create({
    baseURL: "https://erp-1-4dlq.onrender.com",
    // baseURL: "http://localhost:3000/",
    withCredentials: true,
});

const useAxiosPublic = () => {
    return axiosPublic;
};

export default useAxiosPublic;