import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ADJUST/remove if you're not using react-router
import logo from "../../../../assets/Slide1.png"
import { useAuth } from '../../../auth/AuthContext';
const COLORS = {
    bg: "#F2EFE6",
    panel: "#FFFFFF",
    panelBorder: "#E1DACB",
    ink: "#1B2C47",
    inkDim: "#4C5A72",
    steel: "#8A8470",
    fieldBg: "#F7F5EF",
    fieldBorder: "#DCD5C4",
    rust: "#C1602E",
    rustDark: "#A34F24",
    danger: "#B8452A",
};

const Login = () => {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate(); // ADJUST/remove if you're not using react-router
    const { login } = useAuth();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const digits = phone.replace(/\D/g, "");
        if (digits.length < 9) {
            setError("Enter a valid phone number.");
            return;
        }
        if (!password) {
            setError("Enter your password.");
            return;
        }
        const phoneNo = digits;

        setLoading(true);
        try {
            await login(phoneNo, password); // updates AuthContext's accessToken + user
            navigate("/dashboard/home"); // ADJUST to your actual post-login route
        } catch (err) {
            setError(err.response?.data?.message || "Invalid phone number or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: COLORS.bg,
                backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(27,44,71,0.02) 0px, rgba(27,44,71,0.02) 1px, transparent 1px, transparent 10px)",
                fontFamily: "'Inter', sans-serif",
                padding: "24px",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
                .sm-input::placeholder { color: #A6A08E; }
                .sm-input:focus { outline: none; border-color: ${COLORS.rust} !important; box-shadow: 0 0 0 3px rgba(193,96,46,0.14); }
                .sm-btn:hover { transform: rotate(0deg) !important; background: ${COLORS.rustDark} !important; }
                .sm-eye:hover { color: ${COLORS.ink} !important; }
            `}</style>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 380, width: "100%" }}>
                {/* hangtag string + punch hole */}
                <svg width="40" height="34" viewBox="0 0 40 34" style={{ marginBottom: -1 }}>
                    <circle cx="20" cy="8" r="5" fill="none" stroke={COLORS.steel} strokeWidth="2" />
                    <path d="M 20 13 Q 20 26 20 26" stroke={COLORS.steel} strokeWidth="2" fill="none" />
                </svg>

                <div
                    style={{
                        width: "100%",
                        background: COLORS.panel,
                        border: `1px solid ${COLORS.panelBorder}`,
                        borderRadius: 4,
                        padding: "36px 32px 32px",
                        boxSizing: "border-box",
                        boxShadow: "0 1px 3px rgba(27,44,71,0.06)",
                    }}
                >
                    {/* logo */}
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
                        <div
                            style={{
                                width: 140,
                                height: 140,
                                border: `1.5px dashed ${COLORS.steel}`,
                                borderRadius: 4,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                padding: 4,
                                boxSizing: "border-box",
                            }}
                        >
                            <img
                                src={logo}
                                alt="Company logo"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                }}
                            />
                        </div>
                    </div>

                    <h1
                        style={{
                            fontFamily: "'Fraunces', serif",
                            fontStyle: "italic",
                            fontWeight: 500,
                            fontSize: 28,
                            color: COLORS.ink,
                            textAlign: "center",
                            margin: "0 0 6px",
                        }}
                    >
                        Sign in
                    </h1>
                    <p
                        style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            letterSpacing: "0.15em",
                            color: COLORS.steel,
                            textAlign: "center",
                            textTransform: "uppercase",
                            margin: 0,
                        }}
                    >
                        SM SOURCING AUDIT
                    </p>

                    {/* perforated divider */}
                    <div style={{ position: "relative", margin: "26px -32px 24px" }}>
                        <div style={{ position: "absolute", left: -6, top: -5, width: 11, height: 11, borderRadius: "50%", background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }} />
                        <div style={{ position: "absolute", right: -6, top: -5, width: 11, height: 11, borderRadius: "50%", background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}` }} />
                        <div style={{ borderTop: `1.5px dashed ${COLORS.panelBorder}`, margin: "0 32px" }} />
                    </div>

                    <form onSubmit={handleSubmit}>
                        <label
                            style={{
                                display: "block",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: COLORS.steel,
                                marginBottom: 6,
                            }}
                        >
                            Phone number
                        </label>
                        <div style={{ display: "flex", marginBottom: 18 }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "0 12px",
                                    background: COLORS.fieldBg,
                                    border: `1px solid ${COLORS.fieldBorder}`,
                                    borderRight: "none",
                                    borderRadius: "3px 0 0 3px",
                                    color: COLORS.inkDim,
                                    fontSize: 14,
                                    fontWeight: 500,
                                }}
                            >
                                +880
                            </div>
                            <input
                                className="sm-input"
                                type="tel"
                                inputMode="numeric"
                                placeholder="1XXX-XXXXXX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    background: COLORS.fieldBg,
                                    border: `1px solid ${COLORS.fieldBorder}`,
                                    borderRadius: "0 3px 3px 0",
                                    padding: "11px 12px",
                                    color: COLORS.ink,
                                    fontSize: 14,
                                    fontFamily: "'Inter', sans-serif",
                                }}
                            />
                        </div>

                        <label
                            style={{
                                display: "block",
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 10,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: COLORS.steel,
                                marginBottom: 6,
                            }}
                        >
                            Password
                        </label>
                        <div style={{ position: "relative", marginBottom: error ? 12 : 26 }}>
                            <input
                                className="sm-input"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    background: COLORS.fieldBg,
                                    border: `1px solid ${COLORS.fieldBorder}`,
                                    borderRadius: 3,
                                    padding: "11px 50px 11px 12px",
                                    color: COLORS.ink,
                                    fontSize: 14,
                                    fontFamily: "'Inter', sans-serif",
                                }}
                            />
                            <button
                                type="button"
                                className="sm-eye"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                style={{
                                    position: "absolute",
                                    right: 10,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "none",
                                    border: "none",
                                    color: COLORS.steel,
                                    cursor: "pointer",
                                    padding: 4,
                                    fontSize: 12,
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            >
                                {showPassword ? "HIDE" : "SHOW"}
                            </button>
                        </div>

                        {error && (
                            <p style={{ color: COLORS.danger, fontSize: 12.5, margin: "0 0 16px" }}>{error}</p>
                        )}

                        <button
                            type="submit"
                            className="sm-btn"
                            disabled={loading}
                            style={{
                                width: "100%",
                                background: COLORS.rust,
                                color: "#FFF8F0",
                                border: "none",
                                borderRadius: 3,
                                padding: "13px 0",
                                fontSize: 13,
                                fontWeight: 600,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                cursor: loading ? "default" : "pointer",
                                transform: "rotate(-1deg)",
                                transition: "transform 0.15s ease, background 0.15s ease",
                                opacity: loading ? 0.75 : 1,
                            }}
                        >
                            {loading ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                </div>

                <p style={{ color: COLORS.steel, fontSize: 12.5, marginTop: 20, textAlign: "center" }}>
                    Trouble signing in? Contact your admin.
                </p>
            </div>
        </div>
    );
};

export default Login;