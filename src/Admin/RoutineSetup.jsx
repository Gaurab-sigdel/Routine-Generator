// React and Calendar imports
import React, { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// Firebase Firestore imports
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// DayJS and plugins for date comparison
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// PDF generation library
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Component CSS and utility function
import "./RoutineSetup.css";
import { generateExamRoutine } from "../utils/generateRoutine";

const RoutineSetup = ({ department, batch, onClose }) => {
    // State declarations
    const [startDate, setStartDate] = useState(null);                     // Start date of exam window
    const [endDate, setEndDate] = useState(null);                         // End date of exam window
    const [selectedDate, setSelectedDate] = useState(null);               // Currently selected date on calendar
    const [holidayReason, setHolidayReason] = useState("");              // Holiday reason input
    const [holidays, setHolidays] = useState({});                         // All declared holidays
    const [saving, setSaving] = useState(false);                          // Saving state for DB writes
    const [seasonYear, setSeasonYear] = useState("");                    // Current season + year
    const [generatedRoutine, setGeneratedRoutine] = useState([]);         // Result from routine generation

    const calendarRef = useRef(null); // Ref to calendar container (optional for scroll/focus)

    // Fetch routine data from Firestore when inputs change
    useEffect(() => {
        const fetchRoutineDoc = async () => {
            if (!department || !batch || !seasonYear.trim()) return;

            try {
                const docRef = doc(db, "Routine", seasonYear.trim(), department, batch);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data();
                    setStartDate(data.meta?.startDate || null);
                    setEndDate(data.meta?.endDate || null);
                    setHolidays(data.holidays || {});
                }
            } catch (err) {
                console.error("Failed to fetch routine data:", err);
            }
        };

        fetchRoutineDoc();
    }, [department, batch, seasonYear]);

    // Validate that exam window is exactly 50 days
    const isValidDateRange = () => {
        if (!startDate || !endDate) return false;
        const diff = dayjs(endDate).diff(dayjs(startDate), "day") + 1; // inclusive
        return diff === 50;
    };

    // Check if date falls within exam window
    const isWithinWindow = (dateStr) => {
        if (!startDate || !endDate) return false;
        const date = dayjs(dateStr);
        return date.isSameOrAfter(dayjs(startDate)) && date.isSameOrBefore(dayjs(endDate));
    };

    // Highlight holidays in calendar UI
    const tileClassName = ({ date }) => {
        const formatted = dayjs(date).format("YYYY-MM-DD");
        return holidays[formatted] ? "holiday" : "";
    };

    // Set selected date when user clicks calendar
    const handleDateClick = (date) => {
        const formatted = dayjs(date).format("YYYY-MM-DD");
        setSelectedDate(formatted);
        setHolidayReason("");
    };

    // Add holiday to Firestore and update state
    const addHoliday = async () => {
        if (!selectedDate || !holidayReason.trim()) {
            alert("Provide a holiday reason.");
            return;
        }

        if (!isWithinWindow(selectedDate)) {
            alert("Holiday must be within the exam window.");
            return;
        }

        if (holidays[selectedDate]) {
            alert("Holiday already exists. Remove it before adding a new reason.");
            return;
        }

        const updated = { ...holidays, [selectedDate]: holidayReason };
        setSaving(true);

        try {
            const docRef = doc(db, "Routine", seasonYear.trim(), department, batch);
            await setDoc(docRef, { holidays: updated }, { merge: true });
            setHolidays(updated);
            setSelectedDate(null);
            setHolidayReason("");
        } catch (err) {
            console.error("Failed to save holiday:", err);
            alert("Error saving holiday.");
        } finally {
            setSaving(false);
        }
    };

    // Remove a holiday from Firestore and update state
    const removeHoliday = async () => {
        if (!selectedDate || !holidays[selectedDate]) return;
        if (!window.confirm("Are you sure you want to remove this holiday?")) return;

        const updated = { ...holidays };
        delete updated[selectedDate];

        setSaving(true);

        try {
            const docRef = doc(db, "Routine", seasonYear.trim(), department, batch);
            await setDoc(docRef, { holidays: updated }, { merge: true });
            setHolidays(updated);
            setSelectedDate(null);
            setHolidayReason("");
        } catch (err) {
            console.error("Failed to remove holiday:", err);
            alert("Error removing holiday.");
        } finally {
            setSaving(false);
        }
    };

    // Generate exam routine using external utility
    const handleGenerate = async () => {
        if (!startDate || !endDate || !seasonYear.trim()) {
            alert("Please select start date, end date, and season/year.");
            return;
        }

        if (!isValidDateRange()) {
            alert("Exam window must be between 1 to 60 days.");
            return;
        }

        setSaving(true);

        try {
            const formattedStart = dayjs(startDate).format("YYYY-MM-DD");
            const formattedEnd = dayjs(endDate).format("YYYY-MM-DD");

            const routine = await generateExamRoutine(
                db,
                department,
                batch,
                seasonYear.trim(),
                formattedStart,
                formattedEnd,
                holidays
            );

            if (!routine || routine.length === 0) {
                alert("No subjects found or assigned. Please check Firestore data.");
                return;
            }

            setGeneratedRoutine(routine);
            alert("Routine generated successfully. See below 👇");
        } catch (err) {
            console.error("Routine generation failed:", err);
            alert("❌ Failed to generate routine. See console for details.");
        } finally {
            setSaving(false);
        }
    };

    // Export generated routine as a PDF document
    const exportToPDF = () => {
        if (!generatedRoutine.length) {
            alert("No routine data to export.");
            return;
        }

        // Dynamically generate the routine header
        const routineHeader = `${department}_${batch}_${seasonYear}`;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(routineHeader, 14, 20);  // Use the dynamic header for the routine

        const tableData = generatedRoutine.map(entry => [
            entry.date,
            entry.subjectName,
            entry.semester,
        ]);

        autoTable(doc, {
            startY: 30,
            head: [["Date", "Subject Name", "Semester"]],
            body: tableData,
            theme: "striped"
        });

        // Use dynamic header in the file name
        doc.save(`Exam_Routine_${routineHeader}.pdf`);
    };


    return (
        <div className="routine-setup-overlay">
            {/* Main card container */}
            <div className="routine-setup-card" ref={calendarRef}>

                {/* Modal close button */}
                <button className="modal-exit-btn" onClick={onClose}>✖</button>

                <h3>📅 Exam Routine Setup</h3>

                {/* Season + Year input field */}
                <div className="season-year-row">
                    <label htmlFor="season-year">Season & Year:</label>
                    <input
                        id="season-year"
                        type="text"
                        placeholder="e.g., Spring_2025"
                        value={seasonYear}
                        onChange={(e) => setSeasonYear(e.target.value)}
                    />
                </div>

                {/* Date range inputs */}
                <div className="date-range-row">
                    <div>
                        <label htmlFor="start-date">Exam Start Date:</label>
                        <input
                            id="start-date"
                            type="date"
                            value={startDate || ""}
                            onChange={(e) => {
                                const start = e.target.value;
                                setStartDate(start);

                                // Auto-fill 50-day window
                                if (start) {
                                    const autoEnd = dayjs(start).add(49, "day").format("YYYY-MM-DD");
                                    setEndDate(autoEnd);
                                }
                            }}
                        />
                    </div>

                    <div>
                        <label htmlFor="end-date">Exam End Date:</label>
                        <input
                            id="end-date"
                            type="date"
                            value={endDate || ""}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Duration display */}
                {startDate && endDate && isValidDateRange() && (
                    <p className="info">
                        Duration: {dayjs(endDate).diff(dayjs(startDate), "day") + 1} days
                    </p>
                )}

                {/* Calendar and Holiday section */}
                <div className="calendar-holiday-row">

                    {/* Calendar */}
                    <div className="holiday-calendar-box">
                        <Calendar
                            onClickDay={handleDateClick}
                            tileClassName={tileClassName}
                        />

                        {/* Declare or remove holiday */}
                        {selectedDate && (
                            <div className="holiday-declare-form">
                                <p>Selected: {selectedDate}</p>
                                <input
                                    type="text"
                                    placeholder="Reason for holiday (e.g., Holi)"
                                    value={holidayReason}
                                    onChange={(e) => setHolidayReason(e.target.value)}
                                />
                                {holidays[selectedDate] ? (
                                    <button className="remove-btn" onClick={removeHoliday} disabled={saving}>
                                        🗑 Remove Holiday
                                    </button>
                                ) : (
                                    <button className="add-btn" onClick={addHoliday} disabled={saving}>
                                        ➕ Add Holiday
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Holiday list display */}
                    <div className="holiday-list-box">
                        <h5>🗓 Declared Holidays</h5>
                        <ul className="holiday-list">
                            {Object.entries(holidays)
                                .filter(([date]) => isWithinWindow(date))
                                .sort(([a], [b]) => dayjs(a).unix() - dayjs(b).unix())
                                .map(([date, reason]) => (
                                    <li key={date}>
                                        <span className="holiday-date">{date}</span>
                                        <span className="holiday-reason">{reason}</span>
                                    </li>
                                ))}
                            {Object.entries(holidays).filter(([date]) => isWithinWindow(date)).length === 0 && (
                                <li className="no-holidays">No holidays declared..</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Routine generation button */}
                <div className="routine-buttons">
                    <button className="generate-btn" onClick={handleGenerate} disabled={saving}>
                        ✅ Display Routine
                    </button>
                </div>
            </div>

            {/* Routine preview after generation */}
            {generatedRoutine.length > 0 && (
                <div className="routine-preview-container">
                    {/* Updated header to show the department, batch, and season */}
                    <h3>📋 {`${department}_${batch}_${seasonYear}`}</h3> {/* Dynamic header */}

                    <div className="routine-table-wrapper">
                        <table className="routine-preview-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Subject Name</th>
                                    <th>Semester</th>
                                </tr>
                            </thead>
                            <tbody>
                                {generatedRoutine.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{entry.date}</td>
                                        <td>{entry.subjectName}</td>
                                        <td>{entry.semester}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Export section */}
                    <div className="generated-routine-modal">
                        <button className="routine-close-btn" onClick={onClose} title="Close">✖</button>
                        <h3>📄 Generated Routine</h3>
                        <table className="routine-table">
                            {/* additional styling or content can go here */}
                        </table>
                        <div className="routine-buttons-row">
                            <button onClick={exportToPDF} className="pdf-export-btn">
                                📥 Export as PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default RoutineSetup; 
