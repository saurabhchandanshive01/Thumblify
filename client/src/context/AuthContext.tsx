import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import toast from "react-hot-toast";

import api from "../configs/api";
import type { IUser } from "../assets/assets";

interface AuthContextProps {
    isLoggedIn: boolean;
    setIsLoggedIn: (isLoggedIn: boolean) => void;

    user: IUser | null;
    setUser: (user: IUser | null) => void;

    login: (user: {
        email: string;
        password: string;
    }) => Promise<void>;

    signUp: (user: {
        name: string;
        email: string;
        password: string;
    }) => Promise<void>;

    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps>({
    isLoggedIn: false,
    setIsLoggedIn: () => { },

    user: null,
    setUser: () => { },

    login: async () => { },
    signUp: async () => { },
    logout: async () => { },
});

export const AuthProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const [user, setUser] = useState<IUser | null>(null);

    const [isLoggedIn, setIsLoggedIn] =
        useState<boolean>(false);

    const signUp = async ({
        name,
        email,
        password,
    }: {
        name: string;
        email: string;
        password: string;
    }) => {
        try {
            const { data } = await api.post(
                "/api/auth/register",
                {
                    name,
                    email,
                    password,
                }
            );

            if (data.user) {
                setUser(data.user as IUser);
                setIsLoggedIn(true);
            }

            toast.success(data.message);
        } catch (error: any) {
            console.log(error);
            toast.error(
                error.response?.data?.message ||
                error.message ||
                "Signup failed"
            );
        }
    };

    const login = async ({
        email,
        password,
    }: {
        email: string;
        password: string;
    }) => {
        try {
            const { data } = await api.post(
                "/api/auth/login",
                {
                    email,
                    password,
                }
            );

            if (data.user) {
                setUser(data.user as IUser);
                setIsLoggedIn(true);
            }

            toast.success(data.message);
        } catch (error: any) {
            console.log(error);
            toast.error(
                error.response?.data?.message ||
                error.message ||
                "Login failed"
            );
        }
    };

    const logout = async () => {
        try {
            const { data } = await api.post(
                "/api/auth/logout"
            );

            setUser(null);
            setIsLoggedIn(false);

            toast.success(data.message);
        } catch (error: any) {
            console.log(error);
            toast.error(
                error.response?.data?.message ||
                error.message ||
                "Logout failed"
            );
        }
    };

    const fetchUser = async () => {
        try {
            const { data } = await api.get(
                "/api/auth/verify"
            );

            if (data.user) {
                setUser(data.user as IUser);
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        (async () => {
            await fetchUser();
        })();
    }, []);

    const value = {
        user,
        setUser,

        isLoggedIn,
        setIsLoggedIn,

        signUp,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
