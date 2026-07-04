// import axios from 'axios';

// const axiosPrivate = axios.create({
//     // baseURL: "https://erp-7-44h5.onrender.com",
//     baseURL: "http://localhost:3000",
//     withCredentials: true,
// });

// export default axiosPrivate;



import axios from 'axios';

const axiosPrivate = axios.create({
    baseURL: "https://erp-7-44h5.onrender.com",
    // baseURL: "http://localhost:3000",
    withCredentials: true,
});

const useAxiosPrivate = () => {
    return axiosPrivate;
};

export default useAxiosPrivate;