import axios from 'axios';

const axiosPublic = axios.create({
    baseURL: "https://erp-5-37o0.onrender.com",
    // baseURL: "http://localhost:3000",
    withCredentials: true,
});

const useAxiosPublic = () => {
    return axiosPublic;
};

export default useAxiosPublic;