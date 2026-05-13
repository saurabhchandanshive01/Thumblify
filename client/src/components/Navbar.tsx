import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    const navigate = useNavigate();

    const { isLoggedIn, user, logout } = useAuth();

    return (
        <nav className="w-full fixed top-0 left-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

                {/* Logo */}
                <Link
                    to="/"
                    className="text-2xl font-bold text-white"
                >
                    Thumblify
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8 transition duration-500">
                    <Link
                        to="/"
                        className="hover:text-pink-300 transition"
                    >
                        Home
                    </Link>

                    <Link
                        to="/generate"
                        className="hover:text-pink-300 transition"
                    >
                        Generate
                    </Link>

                    {
                        isLoggedIn ? (
                            <Link
                                to="/my-generation"
                                className="hover:text-pink-300 transition"
                            >
                                My Generations
                            </Link>
                        ) : (
                            <Link
                                to="#"
                                className="hover:text-pink-300 transition"
                            >
                                About
                            </Link>
                        )
                    }

                    <Link
                        to="#"
                        className="hover:text-pink-300 transition"
                    >
                        Contact us
                    </Link>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-2">

                    {
                        isLoggedIn ? (
                            <div className="relative group">

                                <button
                                    className="rounded-full size-8 bg-white/20 border-2 border-white/10"
                                >
                                    {user?.name?.charAt(0).toUpperCase()}
                                </button>

                                <div
                                    className="absolute hidden group-hover:block top-6 right-0 pt-4"
                                >
                                    <button
                                        onClick={() => logout()}
                                        className="bg-white/20 border-2 border-white/10 px-5 py-1.5 rounded"
                                    >
                                        Logout
                                    </button>
                                </div>

                            </div>
                        ) : (
                            <button
                                onClick={() => navigate("/login")}
                                className="hidden md:block px-6 py-2.5 bg-pink-600 hover:bg-pink-700 active:scale-95 transition-all rounded-full"
                            >
                                Get Started
                            </button>
                        )
                    }

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden active:ring-2 active:ring-white p-1 rounded"
                    >
                        {
                            isOpen ? <X /> : <Menu />
                        }
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur flex flex-col items-center justify-center text-lg gap-8 md:hidden transition-transform duration-500 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >

                <Link
                    onClick={() => setIsOpen(false)}
                    to="/"
                >
                    Home
                </Link>

                <Link
                    onClick={() => setIsOpen(false)}
                    to="/generate"
                >
                    Generate
                </Link>

                {
                    isLoggedIn ? (
                        <Link
                            onClick={() => setIsOpen(false)}
                            to="/my-generation"
                        >
                            My Generations
                        </Link>
                    ) : (
                        <Link
                            onClick={() => setIsOpen(false)}
                            to="#"
                        >
                            About
                        </Link>
                    )
                }

                <Link
                    onClick={() => setIsOpen(false)}
                    to="#"
                >
                    Contact us
                </Link>

                {
                    isLoggedIn ? (
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                logout();
                            }}
                        >
                            Logout
                        </button>
                    ) : (
                        <Link
                            onClick={() => setIsOpen(false)}
                            to="/login"
                        >
                            Login
                        </Link>
                    )
                }

            </div>
        </nav>
    );
}