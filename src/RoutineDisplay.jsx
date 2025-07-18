import { useNavigate } from 'react-router-dom';
import "./RoutineDisplay.css";


function RoutineDisplay() {
    const navigate = useNavigate();

    return (
        <div className="routine-display-container">
            <button className="routine-display-close" onClick={() => navigate(-1)}>❌</button>
            <br /><br />

            <p>Routine will be available soon.
                <br></br>
                Be patience.
            </p>
        </div>
    );
}

export default RoutineDisplay;
