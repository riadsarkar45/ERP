import axios from 'axios';

const axiosPrivate = axios.create({
     baseURL: "https://erp-7-44h5.onrender.com",
    //baseURL: "http://localhost:3000",
    withCredentials: true,
});

const useAxiosSecureBase = () => {
    return axiosPrivate;
};

export default useAxiosSecureBase;