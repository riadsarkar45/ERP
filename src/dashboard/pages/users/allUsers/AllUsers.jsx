import { useEffect, useState } from "react";
import useAxiosPrivate from "../../../../hooks/UseAxiosPrivate";

const UseAllUsers = () => {
    const axiosPrivate = useAxiosPrivate();
    const [allUsers, setAllUsers] = useState([]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchAllUser = async () => {
            try {
                const response = await axiosPrivate.get("/api/all-users", {
                    signal: controller.signal,
                });
                setAllUsers(response.data);
            } catch (err) {
                if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
                    console.error("Failed to fetch users:", err);
                }
            }
        };

        fetchAllUser();

        return () => {
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { allUsers };
};

export default UseAllUsers;