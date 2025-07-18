import React, { useEffect, useState } from "react";
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import "./HomePage.css";

function HomePage() {
    const [userName, setUserName] = useState("");
    const [batch, setBatch] = useState("");
    const [department, setDepartment] = useState("");
    const [year, setYear] = useState("");
    const [semester, setSemester] = useState("");
    const [regularSubjects, setRegularSubjects] = useState([]);

    const [backSemesters, setBackSemesters] = useState([]);
    const [selectedBackSemester, setSelectedBackSemester] = useState("");
    const [availableBackSubjects, setAvailableBackSubjects] = useState([]);
    const [selectedBackSubjects, setSelectedBackSubjects] = useState([]);

    const [seasonYear, setSeasonYear] = useState("");
    const [routineData, setRoutineData] = useState(null);
    const [showRoutineModal, setShowRoutineModal] = useState(false);


    const navigate = useNavigate();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            navigate("/login");
            return;
        }

        const fetchUserName = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    setUserName(userDoc.data().name);
                }
            } catch (err) {
                console.error("Failed to fetch user name:", err);
            }
        };

        fetchUserName();
    }, [navigate]);


    useEffect(() => {
        const fetchRegularSubjects = async () => {
            if (!department || !batch || !semester) {
                setRegularSubjects([]);
                return;
            }

            try {
                const subjectsRef = collection(
                    db,
                    "departments", department,
                    "batches", batch,
                    "semesters", semester,
                    "subjects"
                );

                const snapshot = await getDocs(subjectsRef);
                const fetchedSubjects = snapshot.docs.map(doc => doc.data().subjectName);
                setRegularSubjects(fetchedSubjects);
            } catch (error) {
                console.error("Error fetching regular subjects:", error);
                setRegularSubjects([]);
            }
        };

        fetchRegularSubjects();
    }, [department, batch, semester]);

    useEffect(() => {
        const fetchBackSemesters = async () => {
            if (!department || !batch || !semester) return;

            const semesterOrder = [
                "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
                "5th Semester", "6th Semester", "7th Semester", "8th Semester"
            ];

            const currentSemesterIndex = semesterOrder.indexOf(semester);
            if (currentSemesterIndex === -1) return;

            const previousSemesters = semesterOrder.slice(0, currentSemesterIndex);

            const formatted = previousSemesters.map(sem => {
                let year = "";
                if (sem.includes("1st") || sem.includes("2nd")) year = "1st Year";
                else if (sem.includes("3rd") || sem.includes("4th")) year = "2nd Year";
                else if (sem.includes("5th") || sem.includes("6th")) year = "3rd Year";
                else if (sem.includes("7th") || sem.includes("8th")) year = "4th Year";
                return `${year} - ${sem}`;
            });

            setBackSemesters(formatted);
        };

        fetchBackSemesters();
    }, [department, batch, semester]);

    const handleBackSemesterChange = async (e) => {
        const selected = e.target.value;
        setSelectedBackSemester(selected);
        if (!selected) return;

        const [, semPart] = selected.split(" - ");

        try {
            const subjectsRef = collection(
                db,
                "departments", department,
                "batches", batch,
                "semesters", semPart,
                "subjects"
            );
            const snapshot = await getDocs(subjectsRef);
            const subjects = snapshot.docs.map(doc => doc.data().subjectName);
            setAvailableBackSubjects(subjects);
        } catch (error) {
            console.error("Error fetching back subjects:", error);
            setAvailableBackSubjects([]);
        }
    };

    const handleBackSubjectChange = (e) => {
        const subject = e.target.value;
        if (subject && !selectedBackSubjects.find(s => s.name === subject)) {
            setSelectedBackSubjects([...selectedBackSubjects, {
                name: subject,
                semester: selectedBackSemester
            }]);
        }
    };

    const removeBackSubject = subject => {
        setSelectedBackSubjects(selectedBackSubjects.filter(s => s.name !== subject));
    };


    const logout = () => {
        auth.signOut();
        navigate("/login");
    };

    const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const semestersByYear = {
        "1st Year": ["1st Semester", "2nd Semester"],
        "2nd Year": ["3rd Semester", "4th Semester"],
        "3rd Year": ["5th Semester", "6th Semester"],
        "4th Year": ["7th Semester", "8th Semester"]
    };
    const handleRoutineFetch = async () => {
        if (!seasonYear || !department || !batch) return;

        try {
            const routineDocRef = doc(db, "Routine", seasonYear, department, batch);
            const routineSnapshot = await getDoc(routineDocRef);

            if (routineSnapshot.exists()) {
                setRoutineData(routineSnapshot.data());
                setShowRoutineModal(true);
            } else {
                alert("Routine not found for selected season, department, and batch.");
                setRoutineData(null);
                setShowRoutineModal(false);
            }
        } catch (err) {
            console.error("Error fetching routine:", err);
            alert("Failed to fetch routine.");
        }
    };

    return (
        <div className="student-container">
            <div className="header">
                <span className="welcome-text">Welcome, {userName || auth.currentUser?.displayName || auth.currentUser?.email}</span>
                <button className="logout-button" onClick={logout}>Logout</button>
            </div>

            <h2>Dashboard</h2>

            <div className="row-group">
                <div className="form-group half-width">
                    <label>Department</label>
                    <select value={department} onChange={e => setDepartment(e.target.value)}>
                        <option value="">Select Department</option>
                        <option value="BE Computer">BE Computer</option>
                        <option value="BE Civil">BE Civil</option>
                        <option value="BE IT">BE IT</option>
                    </select>
                </div>
                <div className="form-group half-width">
                    <label>Batch</label>
                    <select value={batch} onChange={e => setBatch(e.target.value)}>
                        <option value="">Select Batch</option>
                        <option value="New">New</option>
                        <option value="Old">Old</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label>Current Year</label>
                <select value={year} onChange={e => {
                    setYear(e.target.value);
                    setSelectedBackSubjects([]);
                }}>
                    <option value="">Select Year</option>
                    {years.map(y => <option key={y}>{y}</option>)}
                </select>
            </div>

            {year && (
                <div className="form-group">
                    <label>Current Semester</label>
                    <select value={semester} onChange={e => {
                        setSemester(e.target.value);
                        setSelectedBackSubjects([]);
                    }}>
                        <option value="">Select Semester</option>
                        {semestersByYear[year].map(s => <option key={s}>{s}</option>)}
                    </select>
                </div>
            )}

            <div className="form-group">
                <label>Backlog Semester</label>
                <select value={selectedBackSemester} onChange={handleBackSemesterChange}>
                    <option value="">Select Semester</option>
                    {backSemesters.map(s => <option key={s}>{s}</option>)}
                </select>
            </div>

            <div className="form-group">
                <label>Available Back Subjects</label>
                <select onChange={handleBackSubjectChange}>
                    <option value="">Select Back Subject</option>
                    {availableBackSubjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                    ))}
                </select>
            </div>

            <div className="routine-section-columns">
                <div className="subject-column">
                    <h3>🟢 Regular Subjects</h3>
                    <ul>
                        {regularSubjects.map((subject, index) => (
                            <li key={index}>{subject}</li>
                        ))}
                    </ul>
                </div>

                <div className="subject-column">
                    <h3>🔴 Back Subjects</h3>
                    <ul>
                        {selectedBackSubjects.map((subj, i) => (
                            <li className="back" key={i}>
                                {subj.name}
                                <button className="remove-btn" onClick={() => removeBackSubject(subj.name)}>&times;</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="form-group">
                <label>Season Year</label>
                <input
                    type="text"
                    placeholder="e.g. Spring_2025"
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(e.target.value)}
                />
            </div>

            <div className="generate-button-wrapper">
                <button className="generate-button" onClick={handleRoutineFetch}>
                    Display Routine
                </button>

            </div>

            {routineData && showRoutineModal && (
                <div className="routine-modal-overlay">
                    <div className="routine-modal-content">
                        <button className="routine-modal-close" onClick={() => setShowRoutineModal(false)}>&times;</button>
                        <h3>📅 Exam Routine</h3>
                        <ul>
                            {routineData.routine
                                .filter(item =>
                                    regularSubjects.includes(item.subjectName) ||
                                    selectedBackSubjects.some(s => s.name === item.subjectName)
                                )
                                .map((item, index) => {
                                    const isBack = selectedBackSubjects.some(s => s.name === item.subjectName);
                                    return (
                                        <li key={index} className={isBack ? "routine-item back" : "routine-item regular"}>
                                            <strong>{item.date}</strong>: {item.subjectName} ({item.semester})
                                        </li>
                                    );
                                })}
                        </ul>
                    </div>
                </div>
            )}



        </div>
    );
}

export default HomePage;
