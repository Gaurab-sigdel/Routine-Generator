import { collection, getDocs, setDoc, doc } from "firebase/firestore";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrBefore);

// Scoring function to rank subjects based on credit, type, and failure rate
const scoreSubject = (subject) => {
    const creditScore = subject.credit * 2;
    const typeScore = subject.examType === "Theory" ? 3 : 2;
    const failureScore = (subject.pastFailureRate || 0) * 2;
    return creditScore + typeScore + failureScore;
};

// Main routine generation function
export const generateExamRoutine = async (
    db,
    department,
    batch,
    seasonYear,
    startDate,
    endDate,
    holidays
) => {
    const semesterLabels = [
        "1st Semester", "2nd Semester",
        "3rd Semester", "4th Semester",
        "5th Semester", "6th Semester",
        "7th Semester", "8th Semester"
    ];

    const allSubjects = [];

    // Fetch all subjects for every semester
    for (const semester of semesterLabels) {
        const ref = collection(
            db,
            "departments", department,
            "batches", batch,
            "semesters", semester,
            "subjects"
        );
        const snapshot = await getDocs(ref);

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            allSubjects.push({
                subjectName: data.subjectName,
                semester,
                credit: data.credit || 3,
                examType: data.examType || "Theory",
                pastFailureRate: data.pastFailureRate || 0
            });
        });
    }

    // Build a pool of available exam dates (excluding holidays)
    const datePool = [];
    let current = dayjs(startDate);

    while (datePool.length < 50) {
        const formatted = current.format("YYYY-MM-DD");
        if (!holidays[formatted]) {
            datePool.push(formatted);
        }

        current = current.add(1, "day");

        // Prevent infinite loop if not enough valid dates
        if (current.diff(dayjs(startDate), "day") > 100) {
            throw new Error("Too many holidays or short window. Cannot generate 50 non-holiday exam days.");
        }
    }

    // Try multiple random arrangements and select best-scoring one
    let bestRoutine = null;
    let bestScore = -Infinity;
    const ATTEMPTS = 20; // Number of random trials

    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const subjects = [...allSubjects].sort(() => Math.random() - 0.5); // Shuffle subjects
        const routine = Array(datePool.length).fill(null); // Empty routine placeholder
        const usedDates = new Set();
        let score = 0;

        for (const subject of subjects) {
            const { semester, subjectName } = subject;
            let placed = false;

            // Try to find a valid date slot without same semester clash
            for (let i = 0; i < routine.length; i++) {
                const prev1 = routine[i - 1];
                const prev2 = routine[i - 2];
                const prev1Same = prev1?.semester === semester;
                const prev2Same = prev2?.semester === semester;

                if (!routine[i] && !prev1Same && !prev2Same && !usedDates.has(i)) {
                    routine[i] = {
                        date: datePool[i],
                        subjectName,
                        semester
                    };
                    usedDates.add(i);
                    score += scoreSubject(subject);
                    placed = true;
                    break;
                }
            }

            // If not placed, penalize
            if (!placed) {
                score -= 50;
            }
        }

        // Keep best scoring arrangement
        if (score > bestScore) {
            bestScore = score;
            bestRoutine = routine;
        }
    }

    // Fill any empty slots with placeholders
    for (let i = 0; i < bestRoutine.length; i++) {
        if (!bestRoutine[i]) {
            bestRoutine[i] = {
                date: datePool[i],
                subjectName: "-",
                semester: "-"
            };
        }
    }

    // Save routine and metadata to Firestore
    const routineDocRef = doc(db, "Routine", seasonYear, department, batch);
    await setDoc(routineDocRef, {
        meta: {
            startDate,
            endDate: datePool[datePool.length - 1],
            createdAt: new Date().toISOString()
        },
        holidays,
        routine: bestRoutine
    });

    return bestRoutine;
};

