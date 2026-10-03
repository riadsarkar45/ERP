import { useContext, useEffect, useMemo } from "react";
import { useSocket } from "../../hooks/socket.io/socketContext";
import UseAllUsers from "../../dashboard/pages/users/allUsers/AllUsers";
import GlobalChatBox from "./GlobalChatBox";
import { AuthContext } from "../../dashboard/auth/AuthContext";

/**
 * Loads the employee list and renders the chat.
 * It is a separate component so the users request only happens
 * AFTER login (the login page never calls UseAllUsers).
 */
const ChatWithUsers = () => {
    const { allUsers } = UseAllUsers();
    const { user } = useContext(AuthContext);

    const chatUsers = useMemo(() => {
        const list = Array.isArray(allUsers) ? allUsers : [];
        return list
            .filter((u) => u && u.isActive !== false)
            .map((u) => ({
                id: u.id, // keep the original id, exactly like UserList sends it
                name: u.name,
                designation: u.designation,
                workingStation: u.workingStation,
                userRole: u.userRole,
            }));
    }, [allUsers]);

    return <GlobalChatBox currentUserId={user?.id} users={chatUsers} />;
};

const ChatLauncher = ({ currentUserId: currentUserIdProp }) => {
    const socket = useSocket();

    // The logged-in user's id: the socket connects with { auth: { userId } }.
    // You can also pass it as a prop: <ChatLauncher currentUserId={user.id} />
    const authFromSocket = socket && typeof socket.auth === "object" ? socket.auth : null;
    const currentUserId = currentUserIdProp ?? authFromSocket?.userId;

    useEffect(() => {
        if (socket && !currentUserId) {
            console.warn("Chat: logged-in user id not found. Pass it as <ChatLauncher currentUserId={...} />.");
        }
    }, [socket, currentUserId]);

    if (!socket || !currentUserId) return null; // not logged in yet: no chat

    return <ChatWithUsers currentUserId={currentUserId} />;
};

export default ChatLauncher;