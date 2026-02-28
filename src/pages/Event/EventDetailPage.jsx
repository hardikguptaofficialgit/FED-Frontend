/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useContext } from "react";
import style from "./styles/EventDetailPage.module.scss";
import { useNavigate, useParams } from "react-router-dom";
import shareOutline from "../../assets/images/shareOutline.svg";
import Share from "../../features/Modals/Event/ShareModal/ShareModal";
import { MdGroups, MdArrowBackIos, MdLocationOn, MdCalendarToday, MdAccessTime } from "react-icons/md";
import { FaUser, FaRupeeSign } from "react-icons/fa";
import { PiClockCountdownDuotone } from "react-icons/pi";
import { IoIosLock } from "react-icons/io";
import AuthContext from "../../context/AuthContext";
import { Blurhash } from "react-blurhash";
import { Alert, ComponentLoading } from "../../microInteraction";
import { api } from "../../services";
import { parse, differenceInMilliseconds } from "date-fns";
import { ChatBot } from "../../features";

const EventDetailPage = () => {
    useEffect(() => { window.scrollTo(0, 0); }, []);

    const navigate = useNavigate();
    const [remainingTime, setRemainingTime] = useState("");
    const [btnTxt, setBtnTxt] = useState("Register Now");
    const authCtx = useContext(AuthContext);
    const [alert, setAlert] = useState(null);
    const { eventId } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [info, setInfo] = useState({});
    const [data, setData] = useState({});
    const [isRegisteredInRelatedEvents, setIsRegisteredInRelatedEvents] = useState(false);
    const [pastEvents, setPastEvents] = useState([]);
    const [ongoingEvents, setOngoingEvents] = useState([]);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isShareOpen, setShareOpen] = useState(false);

    // Fetch event data
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await api.get("/api/form/getAllForms");
                if (response.status === 200) {
                    const fetchedEvents = response.data.events;
                    const ongoing = fetchedEvents.filter((event) => !event.info.isEventPast);
                    const past = fetchedEvents.filter((event) => event.info.isEventPast);
                    setOngoingEvents(ongoing);
                    setPastEvents(past);
                    const eventData = fetchedEvents.find((e) => e.id === eventId);
                    setData(eventData);
                    setInfo(eventData?.info || {});
                } else {
                    setAlert({ type: "error", message: "Error fetching event details.", position: "bottom-right", duration: 3000 });
                }
            } catch (error) {
                console.error("Error fetching event:", error);
                setAlert({ type: "error", message: "Error fetching event details.", position: "bottom-right", duration: 3000 });
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);

    useEffect(() => {
        if (alert) {
            const { type, message, position, duration } = alert;
            Alert({ type, message, position, duration });
            setAlert(null);
        }
    }, [alert]);

    useEffect(() => {
        if (info.regDateAndTime) {
            calculateRemainingTime();
            const intervalId = setInterval(calculateRemainingTime, 1000);
            return () => clearInterval(intervalId);
        }
    }, [info.regDateAndTime]);

    const dateStr = info.eventDate;
    const date = new Date(dateStr);
    const day = date.getDate();
    const getOrdinalSuffix = (d) => {
        if (d > 3 && d < 21) return "th";
        switch (d % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
    };
    const formattedDate = `${day}${getOrdinalSuffix(day)} ${date.toLocaleDateString("en-GB", { month: "long" })} ${date.getFullYear()}`;

    const calculateRemainingTime = () => {
        const regStartDate = parse(info.regDateAndTime, "MMMM do yyyy, h:mm:ss a", new Date());
        const timeDifference = differenceInMilliseconds(regStartDate, new Date());
        if (timeDifference <= 0) { setRemainingTime(null); return; }
        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
        const seconds = Math.floor((timeDifference / 1000) % 60);
        setRemainingTime(days > 0 ? `${days} day${days > 1 ? "s" : ""} left` : [hours > 0 ? `${hours}h ` : "", minutes > 0 ? `${minutes}m ` : "", seconds > 0 ? `${seconds}s` : ""].join("").trim());
    };

    useEffect(() => {
        if (info.isRegistrationClosed || info.isEventPast) { setBtnTxt("Closed"); }
        else if (remainingTime) { setBtnTxt(authCtx.user.access === "USER" ? "Locked" : remainingTime); }
        else { setBtnTxt("Register Now"); }
    }, [info.isRegistrationClosed, remainingTime]);

    useEffect(() => {
        const registeredEventIds = authCtx.user.regForm || [];
        const relatedEventIds = ongoingEvents.map((e) => e.info.relatedEvent).filter((id) => id && id !== "null").filter((id, i, s) => s.indexOf(id) === i);
        if (registeredEventIds.length > 0 && relatedEventIds.length > 0) {
            if (relatedEventIds.some((id) => registeredEventIds.includes(id))) setIsRegisteredInRelatedEvents(true);
        }
    }, [ongoingEvents, authCtx.user.regForm]);

    useEffect(() => {
        if (authCtx.isLoggedIn && authCtx.user.regForm) {
            if (info.isRegistrationClosed) { setBtnTxt("Closed"); return; }
            if (authCtx.user.regForm.includes(data?.id)) { setBtnTxt("Already Registered"); return; }
            if (data?.info?.relatedEvent !== "null" && authCtx.user.access === "USER") {
                setBtnTxt(data?.info?.isRegistrationClosed ? "Closed" : "Locked"); return;
            }
            setBtnTxt(remainingTime ? remainingTime : data?.info?.isRegistrationClosed ? "Closed" : "Register Now");
        }
    }, [authCtx.isLoggedIn, authCtx.user.regForm, data, info.isRegistrationClosed, isRegisteredInRelatedEvents, remainingTime]);

    const handleForm = () => {
        if (authCtx.isLoggedIn) {
            if (authCtx.user.access !== "USER" && authCtx.user.access !== "ADMIN") {
                setBtnTxt("Already Member");
                setAlert({ type: "info", message: "Team Members are not allowed to register for the Event", position: "bottom-right", duration: 3000 });
            } else {
                navigate("/Events/" + data?.id + "/Register");
            }
        } else {
            sessionStorage.setItem("prevPage", window.location.pathname);
            navigate("/login");
        }
    };

    // Parse schedule from description if it contains schedule data
    const parseSchedule = () => {
        if (!info.schedule) return [];
        try { return typeof info.schedule === "string" ? JSON.parse(info.schedule) : info.schedule; }
        catch { return []; }
    };
    const schedule = parseSchedule();

    const url = window.location.href;
    const isDisabled = ["Closed", "Already Registered", "Already Member", "Locked"].includes(btnTxt) || btnTxt === remainingTime;

    return (
        <>
            <ChatBot />
            <div style={pageStyle}>
                <button style={backBtnStyle} onClick={() => navigate(-1)}>
                    <MdArrowBackIos size={14} /> Back
                </button>

                {isLoading ? (
                    <ComponentLoading customStyles={{ width: "100%", height: "60vh", display: "flex", justifyContent: "center", alignItems: "center" }} />
                ) : !data ? (
                    <div style={{ color: "white", textAlign: "center", marginTop: "4rem" }}>Event not found.</div>
                ) : (
                    <div style={containerStyle}>
                        {/* LEFT COLUMN */}
                        <div style={leftColStyle}>
                            {/* Banner */}
                            <div style={bannerWrapStyle}>
                                {!imageLoaded && (
                                    <Blurhash hash="LEG8_%els7NgM{M{RiNI*0IVog%L" width="100%" height={340} resolutionX={32} resolutionY={32} punch={1} style={{ borderRadius: "12px" }} />
                                )}
                                <img
                                    src={info.eventImg}
                                    style={{ ...bannerImgStyle, display: imageLoaded ? "block" : "none" }}
                                    alt={info.eventTitle}
                                    onLoad={() => setImageLoaded(true)}
                                />
                                <div style={dateBadgeStyle}>{formattedDate}</div>
                                {info.ongoingEvent && (
                                    <div style={shareBtnStyle} onClick={() => setShareOpen(p => !p)}>
                                        <img src={shareOutline} alt="Share" style={{ width: "18px", height: "18px" }} />
                                    </div>
                                )}
                            </div>

                            {/* Event Title Row */}
                            <div style={titleRowStyle}>
                                <div>
                                    <h1 style={titleStyle}>{info.eventTitle}</h1>
                                    <div style={metaRowStyle}>
                                        {info.participationType === "Team" ? (
                                            <span style={metaChipStyle}><MdGroups color="#f97507" size={18} /> Team: {info.minTeamSize}–{info.maxTeamSize}</span>
                                        ) : (
                                            <span style={metaChipStyle}><FaUser color="#f97507" size={13} /> Individual</span>
                                        )}
                                        <span style={metaChipStyle}>
                                            {info.eventAmount ? <><FaRupeeSign color="#f97507" size={13} />{info.eventAmount}</> : <span style={{ color: "#f97507" }}>Free</span>}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* About Section */}
                            <div style={sectionStyle}>
                                <div style={sectionHeaderStyle}>
                                    <span style={sectionIconStyle}>ℹ</span>
                                    <h2 style={sectionTitleStyle}>About the Event</h2>
                                </div>
                                <div style={dividerStyle} />
                                <p style={descStyle}>
                                    {info.eventdescription
                                        ? info.eventdescription.split("\n").map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)
                                        : "Detailed description for this event will be updated shortly."}
                                </p>
                            </div>

                            {/* Schedule Section — only if schedule data exists */}
                            {schedule.length > 0 && (
                                <div style={sectionStyle}>
                                    <div style={sectionHeaderStyle}>
                                        <span style={sectionIconStyle}>📅</span>
                                        <h2 style={sectionTitleStyle}>Schedule &amp; Agenda</h2>
                                    </div>
                                    <div style={dividerStyle} />
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {schedule.map((item, i) => (
                                            <div key={i} style={scheduleItemStyle}>
                                                <span style={scheduleTimeStyle}>{item.time}</span>
                                                <span style={{ color: "#e0e0e0", fontSize: "0.95rem" }}>{item.title || item.event}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Location Section — only if location exists */}
                            {info.eventLocation && (
                                <div style={sectionStyle}>
                                    <div style={sectionHeaderStyle}>
                                        <span style={sectionIconStyle}>📍</span>
                                        <h2 style={sectionTitleStyle}>Location</h2>
                                    </div>
                                    <div style={dividerStyle} />
                                    <div style={locationStyle}>
                                        <MdLocationOn color="#f97507" size={20} />
                                        <span style={{ color: "#e0e0e0", fontSize: "0.95rem" }}>{info.eventLocation}</span>
                                    </div>
                                </div>
                            )}

                            {/* Event Date & Time — only if exists */}
                            {info.eventTime && (
                                <div style={sectionStyle}>
                                    <div style={sectionHeaderStyle}>
                                        <span style={sectionIconStyle}>🕐</span>
                                        <h2 style={sectionTitleStyle}>Date &amp; Time</h2>
                                    </div>
                                    <div style={dividerStyle} />
                                    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                                        <div style={locationStyle}>
                                            <MdCalendarToday color="#f97507" size={16} />
                                            <span style={{ color: "#e0e0e0", fontSize: "0.95rem" }}>{formattedDate}</span>
                                        </div>
                                        <div style={locationStyle}>
                                            <MdAccessTime color="#f97507" size={16} />
                                            <span style={{ color: "#e0e0e0", fontSize: "0.95rem" }}>{info.eventTime}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN — Registration Panel */}
                        <div style={rightColStyle}>
                            <div style={regPanelStyle}>
                                <h3 style={regPanelTitleStyle}>Registration</h3>
                                <p style={regPanelSubStyle}>
                                    {btnTxt === "Already Registered"
                                        ? "You've already registered for this event!"
                                        : btnTxt === "Closed"
                                            ? "Registration for this event is now closed."
                                            : btnTxt === "Locked"
                                                ? "Complete prerequisites to unlock registration."
                                                : remainingTime
                                                    ? `Registration opens in ${remainingTime}`
                                                    : "Don't miss out on this event. Secure your spot now!"}
                                </p>

                                {/* Date info in panel */}
                                <div style={regInfoRowStyle}>
                                    <MdCalendarToday color="#f97507" size={16} />
                                    <span style={{ color: "#aaa", fontSize: "0.875rem" }}>{formattedDate}</span>
                                </div>
                                {info.eventTime && (
                                    <div style={regInfoRowStyle}>
                                        <MdAccessTime color="#f97507" size={16} />
                                        <span style={{ color: "#aaa", fontSize: "0.875rem" }}>{info.eventTime}</span>
                                    </div>
                                )}
                                {info.eventLocation && (
                                    <div style={regInfoRowStyle}>
                                        <MdLocationOn color="#f97507" size={16} />
                                        <span style={{ color: "#aaa", fontSize: "0.875rem" }}>{info.eventLocation}</span>
                                    </div>
                                )}

                                <div style={regDividerStyle} />

                                <button
                                    style={{
                                        ...regBtnStyle,
                                        opacity: isDisabled ? 0.5 : 1,
                                        cursor: isDisabled ? "not-allowed" : "pointer",
                                    }}
                                    onClick={handleForm}
                                    disabled={isDisabled}
                                >
                                    {btnTxt === "Closed" ? (
                                        <><span>Closed</span><IoIosLock size={18} /></>
                                    ) : btnTxt === "Already Registered" ? (
                                        <span>Already Registered</span>
                                    ) : btnTxt === "Locked" ? (
                                        <><span>Locked</span><IoIosLock size={18} /></>
                                    ) : remainingTime ? (
                                        <><PiClockCountdownDuotone size={18} /><span>{btnTxt}</span></>
                                    ) : (
                                        <span>Register Now</span>
                                    )}
                                </button>

                                {/* Participation type badge */}
                                <div style={participationBadgeStyle}>
                                    {info.participationType === "Team" ? (
                                        <><MdGroups color="#f97507" size={20} /><span>Team Event ({info.minTeamSize}–{info.maxTeamSize} members)</span></>
                                    ) : (
                                        <><FaUser color="#f97507" size={14} /><span>Individual Event</span></>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isShareOpen && <Share onClose={() => setShareOpen(p => !p)} urlpath={url} />}
                <Alert />
            </div>
        </>
    );
};

// ─── Inline Styles ────────────────────────────────────────────────────────────

const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#0f0f0f",
    padding: "24px 20px 60px",
    fontFamily: "'Segoe UI', sans-serif",
};

const backBtnStyle = {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "transparent",
    border: "1px solid #333",
    color: "#aaa",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.875rem",
    marginBottom: "24px",
    transition: "border-color 0.2s",
};

const containerStyle = {
    display: "flex",
    gap: "32px",
    maxWidth: "1100px",
    margin: "0 auto",
    alignItems: "flex-start",
    flexWrap: "wrap",
};

const leftColStyle = {
    flex: "1 1 580px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
};

const rightColStyle = {
    flex: "0 0 300px",
    position: "sticky",
    top: "24px",
};

const bannerWrapStyle = {
    position: "relative",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#1a1a1a",
};

const bannerImgStyle = {
    width: "100%",
    height: "340px",
    objectFit: "cover",
    display: "block",
    borderRadius: "12px",
};

const dateBadgeStyle = {
    position: "absolute",
    top: "16px",
    left: "16px",
    background: "rgba(0,0,0,0.75)",
    color: "white",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(255,255,255,0.1)",
};

const shareBtnStyle = {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "rgba(0,0,0,0.6)",
    padding: "8px",
    borderRadius: "50%",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
};

const titleRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
};

const titleStyle = {
    color: "#f97507",
    fontSize: "1.6rem",
    fontWeight: "700",
    margin: "0 0 8px",
};

const metaRowStyle = {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
};

const metaChipStyle = {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    color: "white",
    fontSize: "0.875rem",
    background: "#1e1e1e",
    padding: "4px 12px",
    borderRadius: "20px",
    border: "1px solid #333",
};

const sectionStyle = {
    background: "#161616",
    borderRadius: "12px",
    padding: "20px 24px",
    border: "1px solid #222",
};

const sectionHeaderStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
};

const sectionIconStyle = {
    fontSize: "1.2rem",
};

const sectionTitleStyle = {
    color: "white",
    fontSize: "1.15rem",
    fontWeight: "600",
    margin: 0,
};

const dividerStyle = {
    height: "2px",
    background: "linear-gradient(90deg, #f97507 0%, transparent 100%)",
    marginBottom: "16px",
    borderRadius: "2px",
};

const descStyle = {
    color: "#c0c0c0",
    fontSize: "0.95rem",
    lineHeight: "1.7",
    margin: 0,
};

const scheduleItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#1e1e1e",
    borderRadius: "8px",
    padding: "12px 16px",
    border: "1px solid #2a2a2a",
};

const scheduleTimeStyle = {
    color: "#f97507",
    fontWeight: "600",
    fontSize: "0.875rem",
    minWidth: "80px",
};

const locationStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
};

// Registration Panel
const regPanelStyle = {
    background: "#161616",
    borderRadius: "12px",
    padding: "24px",
    border: "1px solid #2a2a2a",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
};

const regPanelTitleStyle = {
    color: "white",
    fontSize: "1.3rem",
    fontWeight: "700",
    margin: 0,
};

const regPanelSubStyle = {
    color: "#888",
    fontSize: "0.875rem",
    lineHeight: "1.5",
    margin: 0,
};

const regInfoRowStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
};

const regDividerStyle = {
    height: "1px",
    background: "#2a2a2a",
    margin: "4px 0",
};

const regBtnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #f97507, #e06000)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    transition: "transform 0.15s, box-shadow 0.15s",
    boxShadow: "0 4px 20px rgba(249,117,7,0.3)",
};

const participationBadgeStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#888",
    fontSize: "0.8rem",
    padding: "10px",
    background: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #2a2a2a",
};

export default EventDetailPage;


