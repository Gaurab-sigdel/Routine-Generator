// -------------------- IMPORTS --------------------
// React and Firebase imports
import React, { useState, useEffect } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { db } from '../firebase';
import { getDocs, addDoc, doc, deleteDoc, collection, setDoc } from "firebase/firestore";

// CSS and component imports
import './AdminPanel.css';
import RoutineSetup from './RoutineSetup';

const AdminPanel = () => {
    // -------------------- STATE VARIABLES --------------------
    const [department, setDepartment] = useState("");        // Selected department (e.g., BE Computer)
    const [batch, setBatch] = useState("");                  // Selected batch (e.g., New or Old)
    const [adminEmail, setAdminEmail] = useState("");        // Admin email (displayed in header)
    const [allSubjects, setAllSubjects] = useState([]);      // List of all subjects in Firestore
    const [xmlFile, setXmlFile] = useState(null);            // Uploaded XML file for subject import
    const [loading, setLoading] = useState(false);           // Loading state during XML upload
    const [showRoutineSetup, setShowRoutineSetup] = useState(false); // Show/hide routine setup modal
    const [editingId, setEditingId] = useState(null);        // Currently editing subject ID
    const [editExamType, setEditExamType] = useState("Theory"); // Temporary exam type value for edit
    const [editFailureRate, setEditFailureRate] = useState(0);    // Temporary failure rate for edit
    const [seasonYear] = useState("");  // Declare seasonYear state



    const navigate = useNavigate();
    const auth = getAuth();

    // -------------------- LOAD ADMIN + SUBJECTS --------------------
    useEffect(() => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            setAdminEmail(currentUser.email);
        }
        fetchSubjects();
    }, [department, batch]);

    // -------------------- SEMESTER LABELS --------------------
    const semesterLabels = [
        "1st Semester", "2nd Semester",
        "3rd Semester", "4th Semester",
        "5th Semester", "6th Semester",
        "7th Semester", "8th Semester"
    ];

    // -------------------- FETCH SUBJECTS --------------------
    const fetchSubjects = async () => {
        if (!department || !batch) {
            setAllSubjects([]);
            return;
        }

        try {
            let fetched = [];
            for (const semester of semesterLabels) {
                const subjectsRef = collection(db, "departments", department, "batches", batch, "semesters", semester, "subjects");
                const snapshot = await getDocs(subjectsRef);

                snapshot.forEach(docSnap => {
                    fetched.push({
                        id: docSnap.id,
                        semester,
                        ...docSnap.data(),
                    });
                });
            }
            setAllSubjects(fetched);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    // -------------------- LOGOUT --------------------
    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    // -------------------- DELETE SUBJECT --------------------
    const handleDelete = async (id, semester) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this subject?");
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "departments", department, "batches", batch, "semesters", semester, "subjects", id));
            setAllSubjects(allSubjects.filter((subj) => subj.id !== id));
            alert("Subject deleted.");
        } catch (error) {
            console.error("Failed to delete subject:", error);
        }
    };

    // -------------------- HANDLE XML UPLOAD --------------------
    const handleXMLUpload = async (file) => {
        if (!department || !batch) {
            alert("Please select both Department and Batch before uploading.");
            return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            setLoading(true);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                alert("Invalid XML format.");
                setLoading(false);
                return;
            }

            const tables = Array.from(xmlDoc.getElementsByTagName("table:table"));
            const existingSubjectsSet = new Set();

            // Load existing subjects to avoid duplicates
            for (const sem of semesterLabels) {
                const semRef = collection(db, "departments", department, "batches", batch, "semesters", sem, "subjects");
                const snapshot = await getDocs(semRef);
                snapshot.forEach(doc => {
                    existingSubjectsSet.add(doc.data().subjectName + "|" + sem);
                });
            }

            // Process tables (each table contains two semesters)
            for (let semIndex = 0; semIndex < tables.length; semIndex++) {
                const table = tables[semIndex];
                const semester1 = semesterLabels[semIndex * 2];
                const semester2 = semesterLabels[semIndex * 2 + 1];
                const rows = table.getElementsByTagName("table:table-row");

                for (let i = 2; i < rows.length; i++) {
                    const cells = rows[i].getElementsByTagName("table:table-cell");

                    const name1 = cells[1]?.textContent.trim();
                    const credit1 = cells[2]?.textContent.trim();
                    const examType1 = cells[3]?.textContent.trim() || "Theory";
                    const failRate1 = parseFloat(cells[4]?.textContent.trim()) || 0;

                    const name2 = cells[5]?.textContent.trim();
                    const credit2 = cells[6]?.textContent.trim();
                    const examType2 = cells[7]?.textContent.trim() || "Theory";
                    const failRate2 = parseFloat(cells[8]?.textContent.trim()) || 0;

                    if (name1 && credit1 && !existingSubjectsSet.has(name1 + "|" + semester1)) {
                        await addDoc(collection(db, "departments", department, "batches", batch, "semesters", semester1, "subjects"), {
                            subjectName: name1,
                            credit: Number(credit1),
                            year: getYearFromSemester(semester1),
                            examType: examType1,
                            pastFailureRate: failRate1
                        });
                    }

                    if (name2 && credit2 && !existingSubjectsSet.has(name2 + "|" + semester2)) {
                        await addDoc(collection(db, "departments", department, "batches", batch, "semesters", semester2, "subjects"), {
                            subjectName: name2,
                            credit: Number(credit2),
                            year: getYearFromSemester(semester2),
                            examType: examType2,
                            pastFailureRate: failRate2
                        });
                    }
                }
            }

            alert(`Subjects uploaded to: ${department} (${batch} Batch)`);
            setXmlFile(null);
            fetchSubjects();
        };

        reader.readAsText(file);
    };

    // -------------------- MAP SEMESTER TO YEAR --------------------
    const getYearFromSemester = (semester) => {
        if (semester.includes("1st") || semester.includes("2nd")) return "1st Year";
        if (semester.includes("3rd") || semester.includes("4th")) return "2nd Year";
        if (semester.includes("5th") || semester.includes("6th")) return "3rd Year";
        if (semester.includes("7th") || semester.includes("8th")) return "4th Year";
        return "";
    };

    // -------------------- HANDLE EDIT + SAVE --------------------
    const handleSaveEdit = async (subj) => {
        try {
            const docRef = doc(db, "departments", department, "batches", batch, "semesters", subj.semester, "subjects", subj.id);
            await setDoc(docRef, {
                ...subj,
                examType: editExamType,
                pastFailureRate: Number(editFailureRate)
            }, { merge: true });

            alert("Subject updated!");
            setEditingId(null);
            fetchSubjects();
        } catch (err) {
            console.error("Failed to update subject:", err);
            alert("Update failed.");
        }
    };

    // -------------------- JSX RETURN --------------------
    return (
        <div className="admin-panel-container">

            {/* ---------------- HEADER ---------------- */}
            <div className="admin-panel-header">
                <h2>🛠 Admin Panel</h2>
                <div className="admin-panel-user-info">
                    <span>Logged in as: <strong>{adminEmail}</strong></span>
                    <button className="logout-button" onClick={handleLogout}>Logout</button>
                </div>
            </div>

            {/* ---------------- DEPARTMENT + BATCH FORM ---------------- */}
            <div className="admin-panel-content">
                <div className="admin-form-section">
                    <h3>Enter Subjects list to Database:</h3>
                    <label>Department:</label>
                    <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                        <option value="">Select Department</option>
                        <option value="BE Computer">BE Computer</option>
                        <option value="BE IT">BE IT</option>
                        <option value="BE Civil">BE Civil</option>
                    </select>

                    <label>Batch:</label>
                    <select value={batch} onChange={(e) => setBatch(e.target.value)}>
                        <option value="">Select Batch</option>
                        <option value="New">New</option>
                        <option value="Old">Old</option>
                    </select>
                </div>

                <hr />

                {/* ---------------- XML UPLOAD SECTION ---------------- */}
                <h3>Import Subjects via XML</h3>
                <div className="subject-upload-row">
                    <input type="file" accept=".xml" onChange={(e) => setXmlFile(e.target.files[0])} />
                    {xmlFile && !loading && (
                        <button className="upload-proceed-btn" onClick={() => handleXMLUpload(xmlFile)} disabled={loading}>
                            Proceed
                        </button>
                    )}
                    {loading && <span className="uploading-message">Uploading... ⏳</span>}
                </div>
            </div>

            {/* ---------------- SUBJECTS DISPLAY SECTION ---------------- */}
            <div className="subject-list-section">
                {department && batch && (
                    <>
                        <h3>Subjects List</h3>
                        <div className="semester-grid">
                            {[
                                ["1st Semester", "2nd Semester"],
                                ["3rd Semester", "4th Semester"],
                                ["5th Semester", "6th Semester"],
                                ["7th Semester", "8th Semester"],
                            ].map(([leftSem, rightSem], index) => (
                                <div className="semester-row" key={index}>
                                    {[leftSem, rightSem].map((semester) => {
                                        const subjects = allSubjects
                                            .filter(s => s.semester === semester)
                                            .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

                                        return (
                                            <div className="semester-column" key={semester}>
                                                <h4>{semester}</h4>
                                                <ul className="subject-list">
                                                    {subjects.map((subj) => (
                                                        <li key={subj.id}>
                                                            {editingId === subj.id ? (
                                                                <div className="edit-mode">
                                                                    <span><strong>{subj.subjectName}</strong></span>
                                                                    <span>{subj.credit} credit(s)</span>
                                                                    <select value={editExamType} onChange={(e) => setEditExamType(e.target.value)}>
                                                                        <option value="Theory">Theory</option>
                                                                        <option value="Numerical">Numerical</option>
                                                                    </select>
                                                                    <input type="number" min="0" max="1" step="0.1"
                                                                        value={editFailureRate}
                                                                        onChange={(e) => setEditFailureRate(e.target.value)} />
                                                                    <button onClick={() => handleSaveEdit(subj)}>💾 Save</button>
                                                                    <button onClick={() => setEditingId(null)}>❌ Cancel</button>
                                                                </div>
                                                            ) : (
                                                                <div className="view-mode">
                                                                    <span><strong>{subj.subjectName}</strong> - {subj.credit} credit(s)</span>
                                                                    <span> | Type: {subj.examType || "Theory"} </span>
                                                                    <span> | Fail: {subj.pastFailureRate ?? 0} </span>
                                                                    <div className="action-buttons-row">
                                                                        <button onClick={() => {
                                                                            setEditingId(subj.id);
                                                                            setEditExamType(subj.examType || "Theory");
                                                                            setEditFailureRate(subj.pastFailureRate ?? 0);
                                                                        }}>✏️ Edit</button>
                                                                        <button onClick={() => handleDelete(subj.id, subj.semester)}>🗑️</button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* ---------------- ROUTINE GENERATOR MODAL ---------------- */}
            <div className="generate-btn-container">
                <button className="generate-btn" onClick={() => setShowRoutineSetup(true)}>
                    Generate Routine
                </button>
            </div>

            {showRoutineSetup && (
                <RoutineSetup
                    department={department}
                    batch={batch}
                    seasonYear={seasonYear}
                    onClose={() => setShowRoutineSetup(false)}
                    onGenerate={() => {
                        setShowRoutineSetup(false);
                        alert("Routine saved to Firestore successfully.");
                    }}
                />
            )}
        </div>
    );
};

export default AdminPanel;
